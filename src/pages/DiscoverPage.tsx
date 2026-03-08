import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/useProfile";
import ProfileCard from "@/components/ProfileCard";
import BottomNav from "@/components/BottomNav";
import MatchPopup from "@/components/MatchPopup";
import BoostModal from "@/components/BoostModal";
import PageTransition from "@/components/PageTransition";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Undo2, Zap } from "lucide-react";
import type { Profile } from "@/hooks/useProfile";

export default function DiscoverPage() {
  const { user } = useAuth();
  const { data: myProfile } = useProfile();
  const queryClient = useQueryClient();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showMatch, setShowMatch] = useState(false);
  const [matchedProfile, setMatchedProfile] = useState<Profile | null>(null);
  const [showBoost, setShowBoost] = useState(false);
  const [lastSwiped, setLastSwiped] = useState<{ index: number; action: "like" | "pass" | "superlike" } | null>(null);

  const { data: profiles = [], isLoading } = useQuery({
    queryKey: ["discover", user?.id, myProfile?.preference],
    queryFn: async () => {
      if (!user) return [];
      const { data: likedData } = await supabase.from("likes").select("liked_id").eq("liker_id", user.id);
      const likedIds = (likedData || []).map((l) => l.liked_id);
      const { data: blockedData } = await supabase.from("blocked_users").select("blocked_id").eq("blocker_id", user.id);
      const blockedIds = (blockedData || []).map((b) => b.blocked_id);
      const excludeIds = [user.id, ...likedIds, ...blockedIds];

      let query = supabase.from("profiles").select("*").eq("profile_complete", true)
        .not("avatar_url", "is", null).not("user_id", "in", `(${excludeIds.join(",")})`).limit(50);

      if (myProfile?.preference && myProfile.preference !== "everyone") {
        query = query.eq("gender", myProfile.preference);
      }
      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as Profile[];
    },
    enabled: !!user && !!myProfile,
  });

  const likeMutation = useMutation({
    mutationFn: async ({ likedId }: { likedId: string; isSuper: boolean }) => {
      const { error } = await supabase.from("likes").insert({ liker_id: user!.id, liked_id: likedId });
      if (error && error.code !== "23505") throw error;
      const { data: match } = await supabase.from("matches").select("*")
        .or(`and(user1_id.eq.${user!.id},user2_id.eq.${likedId}),and(user1_id.eq.${likedId},user2_id.eq.${user!.id})`).maybeSingle();
      if (match) {
        const { data: profile } = await supabase.from("profiles").select("*").eq("user_id", likedId).single();
        if (profile) { setMatchedProfile(profile as Profile); setShowMatch(true); }
      }
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["matches"] }); },
  });

  const handleLike = () => {
    if (profiles[currentIndex]) {
      setLastSwiped({ index: currentIndex, action: "like" });
      likeMutation.mutate({ likedId: profiles[currentIndex].user_id, isSuper: false });
      setCurrentIndex((i) => i + 1);
    }
  };
  const handlePass = () => { setLastSwiped({ index: currentIndex, action: "pass" }); setCurrentIndex((i) => i + 1); };
  const handleSuperLike = () => {
    if (profiles[currentIndex]) {
      setLastSwiped({ index: currentIndex, action: "superlike" });
      likeMutation.mutate({ likedId: profiles[currentIndex].user_id, isSuper: true });
      toast("⭐ Super Like sent!");
      setCurrentIndex((i) => i + 1);
    }
  };

  const handleRewind = async () => {
    if (!lastSwiped || !user) return;
    if (lastSwiped.action !== "pass") {
      const prevProfile = profiles[lastSwiped.index];
      if (prevProfile) {
        await supabase.from("likes").delete().eq("liker_id", user.id).eq("liked_id", prevProfile.user_id);
      }
    }
    setCurrentIndex(lastSwiped.index);
    setLastSwiped(null);
    toast("↩ Rewound");
  };

  const currentProfile = profiles[currentIndex];
  const nextProfile = profiles[currentIndex + 1];

  return (
    <PageTransition className="min-h-screen pb-20 bg-background">
      {/* Clean minimal header */}
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl px-5 py-3 flex items-center justify-between">
        <h1 className="text-xl font-heading font-semibold text-gradient tracking-tight">Lumos</h1>
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleRewind}
            disabled={!lastSwiped}
            className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center disabled:opacity-20 transition-all active:scale-90"
          >
            <Undo2 className="w-4 h-4 text-foreground" />
          </button>
          <button
            onClick={() => setShowBoost(true)}
            className="w-9 h-9 rounded-full gradient-primary flex items-center justify-center shadow-glow active:scale-90 transition-all"
          >
            <Zap className="w-4 h-4 text-primary-foreground" />
          </button>
        </div>
      </div>

      <div className="relative flex items-center justify-center" style={{ height: "calc(100vh - 140px)" }}>
        {isLoading ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
            <Sparkles className="w-8 h-8 text-primary animate-pulse mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">Finding people near you...</p>
          </motion.div>
        ) : currentProfile ? (
          <div className="relative w-full h-full flex items-center justify-center px-3">
            {nextProfile && (
              <div className="absolute inset-x-0 mx-auto w-full max-w-[370px] aspect-[2.8/4.5] rounded-2xl overflow-hidden opacity-40 scale-[0.92]">
                <div className="absolute inset-0 bg-secondary">
                  {nextProfile.avatar_url && <img src={nextProfile.avatar_url} alt="" className="w-full h-full object-cover" draggable={false} />}
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-background/20 to-transparent" />
              </div>
            )}
            <AnimatePresence mode="popLayout">
              <ProfileCard key={currentProfile.id} profile={currentProfile} onLike={handleLike} onPass={handlePass} onSuperLike={handleSuperLike} />
            </AnimatePresence>
          </div>
        ) : (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center px-10">
            <div className="w-20 h-20 rounded-full bg-secondary flex items-center justify-center mx-auto mb-4">
              <Sparkles className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-heading font-semibold">No more profiles</h3>
            <p className="text-muted-foreground text-sm mt-1.5">Check back later for new people!</p>
          </motion.div>
        )}
      </div>

      <BottomNav />
      <MatchPopup isOpen={showMatch} matchedProfile={matchedProfile} myProfile={myProfile || null} onClose={() => setShowMatch(false)} />
      <BoostModal isOpen={showBoost} onClose={() => setShowBoost(false)} />
    </PageTransition>
  );
}
