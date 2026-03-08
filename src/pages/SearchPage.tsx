import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import ProfileCard from "@/components/ProfileCard";
import BottomNav from "@/components/BottomNav";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Sparkles, Users } from "lucide-react";
import type { Profile } from "@/hooks/useProfile";

type GenderFilter = "male" | "female" | "everyone";

const FILTER_OPTIONS: { value: GenderFilter; label: string; emoji: string }[] = [
  { value: "everyone", label: "Anyone", emoji: "🌍" },
  { value: "male", label: "Male", emoji: "👨" },
  { value: "female", label: "Female", emoji: "👩" },
];

export default function SearchPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [genderFilter, setGenderFilter] = useState<GenderFilter>("everyone");

  const { data: profiles = [], isLoading, refetch } = useQuery({
    queryKey: ["search-profiles", user?.id, genderFilter],
    queryFn: async () => {
      if (!user) return [];

      // Get already liked/passed user IDs
      const { data: likedData } = await supabase
        .from("likes")
        .select("liked_id")
        .eq("liker_id", user.id);
      const likedIds = (likedData || []).map((l) => l.liked_id);

      // Get blocked user IDs
      const { data: blockedData } = await supabase
        .from("blocked_users")
        .select("blocked_id")
        .eq("blocker_id", user.id);
      const blockedIds = (blockedData || []).map((b) => b.blocked_id);

      // Get existing friend requests
      const { data: sentRequests } = await supabase
        .from("friend_requests")
        .select("receiver_id")
        .eq("sender_id", user.id);
      const sentIds = (sentRequests || []).map((r) => r.receiver_id);

      const excludeIds = [user.id, ...likedIds, ...blockedIds, ...sentIds];

      let query = supabase
        .from("profiles")
        .select("*")
        .eq("profile_complete", true)
        .not("avatar_url", "is", null)
        .not("user_id", "in", `(${excludeIds.join(",")})`)
        .limit(50);

      if (genderFilter !== "everyone") {
        query = query.eq("gender", genderFilter);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Shuffle for random order
      const shuffled = [...(data || [])].sort(() => Math.random() - 0.5);
      return shuffled as Profile[];
    },
    enabled: !!user,
  });

  // Reset index when filter changes
  const handleFilterChange = (filter: GenderFilter) => {
    setGenderFilter(filter);
    setCurrentIndex(0);
  };

  const likeMutation = useMutation({
    mutationFn: async (likedId: string) => {
      const { error } = await supabase
        .from("likes")
        .insert({ liker_id: user!.id, liked_id: likedId });
      // Ignore duplicate like (409)
      if (error && error.code !== "23505") throw error;

      // Check if match
      const { data: match } = await supabase
        .from("matches")
        .select("*")
        .or(`and(user1_id.eq.${user!.id},user2_id.eq.${likedId}),and(user1_id.eq.${likedId},user2_id.eq.${user!.id})`)
        .maybeSingle();

      if (match) {
        toast("🎉 It's a match!", {
          description: "You both liked each other! Start chatting now.",
        });
      } else {
        toast.success("Liked! 💕");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["matches"] });
    },
  });

  const handleLike = () => {
    if (profiles[currentIndex]) {
      likeMutation.mutate(profiles[currentIndex].user_id);
      setCurrentIndex((i) => i + 1);
    }
  };

  const handlePass = () => {
    setCurrentIndex((i) => i + 1);
  };

  const currentProfile = profiles[currentIndex];

  return (
    <div className="min-h-screen pb-20">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border px-4 py-3">
        <div className="flex items-center gap-2 mb-3">
          <Search className="w-5 h-5 text-primary" />
          <h1 className="text-xl font-heading font-bold text-gradient">Search</h1>
        </div>

        {/* Gender Filter Tabs */}
        <div className="flex gap-2">
          {FILTER_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => handleFilterChange(opt.value)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-medium transition-all ${
                genderFilter === opt.value
                  ? "gradient-primary text-primary-foreground shadow-glow"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              <span>{opt.emoji}</span>
              <span>{opt.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="p-4 flex items-center justify-center min-h-[calc(100vh-12rem)]">
        {isLoading ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
            <Sparkles className="w-8 h-8 text-primary animate-spin mx-auto mb-3" />
            <p className="text-muted-foreground">Searching for people...</p>
          </motion.div>
        ) : currentProfile ? (
          <AnimatePresence mode="wait">
            <ProfileCard
              key={currentProfile.id}
              profile={currentProfile}
              onLike={handleLike}
              onPass={handlePass}
              swipeable
            />
          </AnimatePresence>
        ) : (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
            <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-heading font-semibold">No more profiles</h3>
            <p className="text-muted-foreground text-sm mt-1">
              Try a different filter or check back later!
            </p>
            <button
              onClick={() => { setCurrentIndex(0); refetch(); }}
              className="mt-4 px-6 py-2 rounded-full gradient-primary text-primary-foreground text-sm font-medium shadow-glow"
            >
              Refresh
            </button>
          </motion.div>
        )}
      </div>

      {/* Swipe hint */}
      {currentProfile && (
        <div className="fixed bottom-20 left-0 right-0 flex justify-center pointer-events-none">
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            className="text-xs text-muted-foreground"
          >
            ← Swipe left to skip · Swipe right to send request →
          </motion.p>
        </div>
      )}

      <BottomNav />
    </div>
  );
}
