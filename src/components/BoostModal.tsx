import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, X, Coins } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface BoostModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const BOOST_COST = 50;
const BOOST_DURATION_MINUTES = 30;

export default function BoostModal({ isOpen, onClose }: BoostModalProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: wallet } = useQuery({
    queryKey: ["wallet", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("wallets")
        .select("*")
        .eq("user_id", user!.id)
        .single();
      return data;
    },
    enabled: !!user,
  });

  const boostMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not authenticated");
      if (!wallet || wallet.balance < BOOST_COST) throw new Error("Not enough points");

      // Deduct points
      const { error: walletErr } = await supabase
        .from("wallets")
        .update({ balance: wallet.balance - BOOST_COST })
        .eq("user_id", user.id);
      if (walletErr) throw walletErr;

      // Record transaction
      await supabase.from("transactions").insert({
        user_id: user.id,
        type: "debit",
        amount: BOOST_COST,
        description: "Profile Boost (30 min)",
      });

      // Create boost
      const expiresAt = new Date(Date.now() + BOOST_DURATION_MINUTES * 60 * 1000).toISOString();
      const { error: boostErr } = await supabase
        .from("profile_boosts" as any)
        .insert({ user_id: user.id, expires_at: expiresAt, points_spent: BOOST_COST });
      if (boostErr) throw boostErr;
    },
    onSuccess: () => {
      toast.success("🚀 Profile boosted for 30 minutes!");
      queryClient.invalidateQueries({ queryKey: ["wallet"] });
      onClose();
    },
    onError: (err: Error) => {
      toast.error(err.message === "Not enough points" ? "Not enough points! Buy more in your wallet." : "Failed to boost");
    },
  });

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[90] flex items-end justify-center bg-background/60 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: 300 }}
            animate={{ y: 0 }}
            exit={{ y: 300 }}
            transition={{ type: "spring", damping: 25 }}
            className="w-full max-w-lg bg-card rounded-t-3xl p-6 border-t border-border"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-heading font-bold">Boost Your Profile</h2>
              <button onClick={onClose} className="p-1"><X className="w-5 h-5" /></button>
            </div>

            <div className="text-center mb-6">
              <div className="w-20 h-20 rounded-full gradient-primary flex items-center justify-center mx-auto mb-4 shadow-glow">
                <Zap className="w-10 h-10 text-primary-foreground" fill="currentColor" />
              </div>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Be a top profile in your area for <strong className="text-foreground">30 minutes</strong>. 
                Get up to <strong className="text-foreground">10x more views</strong>!
              </p>
            </div>

            <div className="flex items-center justify-between bg-secondary rounded-2xl p-4 mb-6">
              <div className="flex items-center gap-2">
                <Coins className="w-5 h-5 text-yellow-500" />
                <span className="font-semibold">{BOOST_COST} points</span>
              </div>
              <span className="text-sm text-muted-foreground">
                Balance: {wallet?.balance ?? 0}
              </span>
            </div>

            <button
              onClick={() => boostMutation.mutate()}
              disabled={boostMutation.isPending || !wallet || wallet.balance < BOOST_COST}
              className="w-full py-3.5 rounded-full gradient-primary text-primary-foreground font-semibold shadow-glow disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Zap className="w-5 h-5" />
              {boostMutation.isPending ? "Boosting..." : "Boost Now"}
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
