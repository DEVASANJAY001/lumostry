import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/useProfile";
import ProfileCard from "@/components/ProfileCard";
import BottomNav from "@/components/BottomNav";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles } from "lucide-react";
import type { Profile } from "@/hooks/useProfile";

export default function DiscoverPage() {
  const { user } = useAuth();
  const { data: myProfile } = useProfile();
  const queryClient = useQueryClient();
  const [currentIndex, setCurrentIndex] = useState(0);

  const { data: profiles = [], isLoading } = useQuery({
    queryKey: ["discover", user?.id, myProfile?.preference],
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

      const excludeIds = [user.id, ...likedIds, ...blockedIds];

      let query = supabase
        .from("profiles")
        .select("*")
        .eq("profile_complete", true)
        .not("avatar_url", "is", null)
        .not("user_id", "in", `(${excludeIds.join(",")})`)
        .limit(50);

      // Filter by preference
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
    mutationFn: async (likedId: string) => {
      const { error } = await supabase
        .from("likes")
        .insert({ liker_id: user!.id, liked_id: likedId });
      // Ignore duplicate like (409)
      if (error && error.code !== "23505") throw error;

      // Check if match was created
      const { data: match } = await supabase
        .from("matches")
        .select("*")
        .or(`and(user1_id.eq.${user!.id},user2_id.eq.${likedId}),and(user1_id.eq.${likedId},user2_id.eq.${user!.id})`)
        .maybeSingle();

      if (match) {
        toast("🎉 It's a match!", {
          description: "You can now start chatting!",
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["matches"] });
    },
  });

  const friendRequestMutation = useMutation({
    mutationFn: async (receiverId: string) => {
      const { error } = await supabase
        .from("friend_requests")
        .insert({ sender_id: user!.id, receiver_id: receiverId });
      if (error) throw error;
      toast.success("Friend request sent! 👋");
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

  const handleFriendRequest = () => {
    if (profiles[currentIndex]) {
      friendRequestMutation.mutate(profiles[currentIndex].user_id);
      setCurrentIndex((i) => i + 1);
    }
  };

  const currentProfile = profiles[currentIndex];

  return (
    <div className="min-h-screen pb-20">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border px-4 py-3">
        <h1 className="text-xl font-heading font-bold text-gradient">Discover</h1>
      </div>

      <div className="p-4 flex items-center justify-center min-h-[calc(100vh-8rem)]">
        {isLoading ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
            <Sparkles className="w-8 h-8 text-primary animate-spin mx-auto mb-3" />
            <p className="text-muted-foreground">Finding people near you...</p>
          </motion.div>
        ) : currentProfile ? (
          <AnimatePresence mode="wait">
            <ProfileCard
              key={currentProfile.id}
              profile={currentProfile}
              onLike={handleLike}
              onPass={handlePass}
              onFriendRequest={handleFriendRequest}
            />
          </AnimatePresence>
        ) : (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
            <div className="text-5xl mb-4">🌟</div>
            <h3 className="text-lg font-heading font-semibold">No more profiles</h3>
            <p className="text-muted-foreground text-sm mt-1">Check back later for new people!</p>
          </motion.div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
