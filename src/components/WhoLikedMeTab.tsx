import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, Eye, Coins, Lock, CheckCircle } from "lucide-react";
import type { Profile } from "@/hooks/useProfile";

const REVEAL_COST = 5;

export default function WhoLikedMeTab() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [revealedIds, setRevealedIds] = useState<Set<string>>(new Set());

  const { data: wallet } = useQuery({
    queryKey: ["wallet", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase.from("wallets").select("*").eq("user_id", user.id).single();
      return data;
    },
    enabled: !!user,
  });

  const { data: likers = [], isLoading } = useQuery({
    queryKey: ["who-liked-me", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data: likesData } = await supabase.from("likes").select("liker_id").eq("liked_id", user.id);
      const likerIds = (likesData || []).map((l) => l.liker_id);
      if (likerIds.length === 0) return [];

      const { data: myLikes } = await supabase.from("likes").select("liked_id").eq("liker_id", user.id);
      const myLikedIds = new Set((myLikes || []).map((l) => l.liked_id));
      const unrequitedLikerIds = likerIds.filter((id) => !myLikedIds.has(id));
      if (unrequitedLikerIds.length === 0) return [];

      const { data: profiles } = await supabase.from("profiles").select("*").in("user_id", unrequitedLikerIds);
      return (profiles || []) as Profile[];
    },
    enabled: !!user,
  });

  const revealMutation = useMutation({
    mutationFn: async (profileUserId: string) => {
      if (!user || !wallet) throw new Error("No wallet");
      if (wallet.balance < REVEAL_COST) throw new Error("Not enough points");
      const { error } = await supabase.from("wallets").update({ balance: wallet.balance - REVEAL_COST }).eq("user_id", user.id);
      if (error) throw error;
      await supabase.from("transactions").insert({ user_id: user.id, amount: -REVEAL_COST, type: "reveal", description: "Revealed who liked you" });
      return profileUserId;
    },
    onSuccess: (profileUserId) => {
      setRevealedIds((prev) => new Set(prev).add(profileUserId));
      queryClient.invalidateQueries({ queryKey: ["wallet"] });
      toast.success("Profile revealed! 👀");
    },
    onError: (err) => {
      if (err.message === "Not enough points") {
        toast.error("Not enough points!", { description: "Add points to reveal profiles." });
      } else {
        toast.error("Something went wrong");
      }
    },
  });

  const handleLikeBack = async (profileUserId: string) => {
    if (!user) return;
    const { error } = await supabase.from("likes").insert({ liker_id: user.id, liked_id: profileUserId });
    if (error && error.code !== "23505") { toast.error("Failed to like back"); return; }
    toast.success("🎉 It's a match!");
    queryClient.invalidateQueries({ queryKey: ["who-liked-me"] });
    queryClient.invalidateQueries({ queryKey: ["matches"] });
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-3 p-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="aspect-[3/4] rounded-2xl bg-secondary animate-pulse" />
        ))}
      </div>
    );
  }

  if (likers.length === 0) {
    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center pt-20 px-8">
        <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mx-auto mb-4">
          <Heart className="w-7 h-7 text-muted-foreground" />
        </div>
        <h3 className="text-base font-heading font-semibold">No likes yet</h3>
        <p className="text-muted-foreground text-sm mt-1.5">Keep swiping — someone will like you soon!</p>
      </motion.div>
    );
  }

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-muted-foreground">{likers.length} people liked you</p>
        <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
          <Coins className="w-3 h-3" />
          <span>{wallet?.balance ?? 0} pts</span>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <AnimatePresence>
          {likers.map((liker, index) => {
            const isRevealed = revealedIds.has(liker.user_id);
            return (
              <motion.div
                key={liker.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 }}
                className="relative aspect-[3/4] rounded-2xl overflow-hidden bg-secondary"
              >
                {liker.avatar_url && (
                  <img src={liker.avatar_url} alt="" className={`w-full h-full object-cover transition-all duration-500 ${isRevealed ? "" : "blur-xl scale-110"}`} draggable={false} />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />

                {!isRevealed && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/20 backdrop-blur-sm">
                    <div className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center">
                      <Lock className="w-5 h-5 text-white" />
                    </div>
                    <button
                      onClick={() => revealMutation.mutate(liker.user_id)}
                      disabled={revealMutation.isPending}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-white/15 backdrop-blur-md text-white text-xs font-medium hover:bg-white/25 transition-all active:scale-95"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Reveal · {REVEAL_COST} pts</span>
                    </button>
                  </div>
                )}

                {isRevealed && (
                  <div className="absolute bottom-0 left-0 right-0 p-3">
                    <p className="text-white font-semibold text-sm truncate">
                      {liker.name}{liker.age ? `, ${liker.age}` : ""}
                    </p>
                    {liker.is_verified && (
                      <span className="inline-flex items-center gap-0.5 text-[10px] text-blue-300">
                        <CheckCircle className="w-3 h-3" /> Verified
                      </span>
                    )}
                    <div className="flex gap-2 mt-2">
                      <button onClick={() => handleLikeBack(liker.user_id)}
                        className="flex-1 py-2 rounded-xl gradient-primary text-primary-foreground text-xs font-medium shadow-glow active:scale-95 transition-all">
                        Like Back 💕
                      </button>
                      <button onClick={() => navigate(`/user/${liker.user_id}`)}
                        className="px-3 py-2 rounded-xl bg-white/15 text-white text-xs font-medium active:scale-95 transition-all">
                        View
                      </button>
                    </div>
                  </div>
                )}

                <div className="absolute top-2 right-2">
                  <div className="w-8 h-8 rounded-full bg-rose-500/80 backdrop-blur-sm flex items-center justify-center">
                    <Heart className="w-4 h-4 text-white" fill="white" />
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
