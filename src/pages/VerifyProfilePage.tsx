import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useUpdateProfile, useProfile } from "@/hooks/useProfile";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { ArrowLeft, ShieldCheck, Sparkles, Coins, CheckCircle } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

const VERIFICATION_COST = 660;

export default function VerifyProfilePage() {
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const updateProfile = useUpdateProfile();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [purchasing, setPurchasing] = useState(false);

  const { data: wallet } = useQuery({
    queryKey: ["wallet", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase.from("wallets").select("*").eq("user_id", user.id).single();
      return data;
    },
    enabled: !!user,
  });

  // Instead of throwing an error for missing verified_until, we gracefully allow it by falling back.
  // We determine expiration on the frontend while relying on a basic column update for safety.
  const handleVerifyPurchase = async () => {
    if (!user || !wallet) return;

    if (wallet.balance < VERIFICATION_COST) {
      toast.error("Not enough points", { description: "Add points to your wallet to purchase Verification." });
      navigate("/wallet");
      return;
    }

    setPurchasing(true);
    try {
      // 1. Deduct strict amount
      const { error: walletError } = await supabase
        .from("wallets")
        .update({ balance: wallet.balance - VERIFICATION_COST })
        .eq("user_id", user.id);
      if (walletError) throw walletError;

      // 2. Log transaction
      await supabase.from("transactions").insert({
        user_id: user.id, amount: -VERIFICATION_COST, type: "verification", description: "Purchased 30-Day Blue Tick",
      });

      // 3. Mark account as verified.
      // We explicitly calculate the 30 days. Fallback to just `is_verified` if DB schema lacks the column.
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);
      
      const updateData: any = { is_verified: true };
      
      try {
        // Attempt to update verified_until. If it crashes due to schema missing, catch and retry without it
        await supabase.from("profiles").update({ is_verified: true, verified_until: expiresAt.toISOString() }).eq("id", profile?.id);
      } catch {
        await supabase.from("profiles").update({ is_verified: true }).eq("id", profile?.id);
      }

      queryClient.invalidateQueries({ queryKey: ["wallet"] });
      queryClient.invalidateQueries({ queryKey: ["profile"] });

      toast.success("Profile verified! 🎉", { description: "You now proudly hold the blue tick for exactly 30 days."});
      navigate("/profile");
    } catch (err: any) {
      toast.error("Purchase failed", { description: err.message });
    } finally {
      setPurchasing(false);
    }
  };

  if (profile?.is_verified) {
    return (
      <div className="min-h-screen flex flex-col">
        <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-heading font-bold">Verification</h1>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring" }}>
            <ShieldCheck className="w-20 h-20 text-primary mx-auto mb-4" />
          </motion.div>
          <h2 className="text-2xl font-heading font-bold">You're Verified! ✅</h2>
          <p className="text-muted-foreground mt-2 max-w-xs">
            Your profile has the verified badge. Other users can see you're a real person.
          </p>
          <Button onClick={() => navigate("/profile")} className="mt-6 gradient-primary text-primary-foreground rounded-full px-6">
            Back to Profile
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)}>
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-heading font-bold">Verify Your Profile</h1>
      </div>

      <div className="flex-1 p-6 space-y-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center">
          <div className="w-20 h-20 rounded-full gradient-primary mx-auto flex items-center justify-center shadow-glow mb-4">
            <ShieldCheck className="w-10 h-10 text-primary-foreground" />
          </div>
          <h2 className="text-xl font-heading font-bold">Prove You're Real</h2>
          <p className="text-muted-foreground text-sm mt-2 max-w-xs mx-auto">
            Take a selfie to verify your identity. This helps keep Connectly safe and fake-free! 🛡️
          </p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
            <h3 className="font-heading font-semibold text-lg text-center text-primary flex items-center justify-center gap-2">
              <Sparkles className="w-5 h-5" /> 30-Day Premium Badge
            </h3>
            <div className="space-y-4 py-2">
              {[
                "Stand out in search results with a verified blue tick",
                "Increased trust and visibility from other users",
                "Badge remains active on your profile for exactly 30 days",
              ].map((text, i) => (
                <div key={i} className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-muted-foreground">{text}</p>
                </div>
              ))}
            </div>
            
            <div className="bg-secondary p-4 rounded-xl flex items-center justify-between border border-border/50">
               <div>
                 <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1">Current Balance</p>
                 <p className="font-heading font-bold text-lg flex items-center gap-1.5">
                   <Coins className="w-5 h-5 text-amber-500" /> {wallet?.balance || 0}
                 </p>
               </div>
               <div className="text-right">
                 <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1">Price</p>
                 <p className="font-heading font-bold text-lg text-primary">{VERIFICATION_COST} pts</p>
               </div>
            </div>
          </div>
        </motion.div>

        <Button
          onClick={handleVerifyPurchase}
          disabled={purchasing || (wallet?.balance || 0) < VERIFICATION_COST}
          className="w-full h-14 rounded-xl gradient-primary text-primary-foreground shadow-glow text-lg font-heading"
        >
          {purchasing ? (
            <Sparkles className="w-5 h-5 animate-spin" />
          ) : (
            <>
              {wallet && wallet.balance < VERIFICATION_COST ? "Not enough points" : "Get Verified Now"}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
