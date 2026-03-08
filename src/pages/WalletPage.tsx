import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import BottomNav from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { ArrowLeft, Wallet, Plus, History, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

declare global {
  interface Window {
    Razorpay: any;
  }
}

export default function WalletPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState<string | null>(null);

  const { data: wallet } = useQuery({
    queryKey: ["wallet", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("wallets")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) throw error;
      if (!data) {
        // Create wallet if doesn't exist
        const { data: newWallet, error: insertErr } = await supabase
          .from("wallets")
          .insert({ user_id: user.id, balance: 0 })
          .select()
          .single();
        if (insertErr) throw insertErr;
        return newWallet;
      }
      return data;
    },
    enabled: !!user,
  });

  const { data: packages } = useQuery({
    queryKey: ["point-packages"],
    queryFn: async () => {
      const { data } = await supabase
        .from("point_packages")
        .select("*")
        .eq("is_active", true)
        .order("sort_order");
      return data || [];
    },
  });

  const { data: transactions } = useQuery({
    queryKey: ["transactions", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from("transactions")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);
      return data || [];
    },
    enabled: !!user,
  });

  const loadRazorpayScript = () => {
    return new Promise<void>((resolve) => {
      if (window.Razorpay) return resolve();
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve();
      document.body.appendChild(script);
    });
  };

  const handlePurchase = async (pkgId: string) => {
    if (!user) return;
    setLoading(pkgId);

    try {
      await loadRazorpayScript();

      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;

      const res = await supabase.functions.invoke("create-razorpay-order", {
        body: { package_id: pkgId },
      });

      if (res.error) throw new Error(res.error.message);
      const orderData = res.data;

      const options = {
        key: orderData.key_id,
        amount: orderData.amount,
        currency: orderData.currency,
        name: "Connectly",
        description: `${orderData.package_name} - ${orderData.points} Points`,
        order_id: orderData.order_id,
        handler: async (response: any) => {
          try {
            const verifyRes = await supabase.functions.invoke("verify-razorpay-payment", {
              body: {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                package_id: pkgId,
              },
            });

            if (verifyRes.error) throw new Error(verifyRes.error.message);
            toast.success(`🎉 ${orderData.points} points added to your wallet!`);
            queryClient.invalidateQueries({ queryKey: ["wallet"] });
            queryClient.invalidateQueries({ queryKey: ["transactions"] });
          } catch (e) {
            toast.error("Payment verification failed");
          }
        },
        theme: { color: "#e63988" },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (e: any) {
      toast.error(e.message || "Failed to initiate payment");
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen pb-20">
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-1">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-heading font-bold text-gradient">Wallet</h1>
      </div>

      <div className="p-5 space-y-6">
        {/* Balance Card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl gradient-primary p-6 text-primary-foreground shadow-glow"
        >
          <div className="flex items-center gap-2 mb-1">
            <Wallet className="w-5 h-5" />
            <span className="text-sm opacity-90">Your Balance</span>
          </div>
          <p className="text-4xl font-heading font-bold">{wallet?.balance || 0}</p>
          <p className="text-sm opacity-75 mt-1">points</p>
        </motion.div>

        {/* Packages */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <h2 className="font-heading font-semibold mb-3 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" /> Top Up Points
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {packages?.map((pkg: any) => (
              <button
                key={pkg.id}
                onClick={() => handlePurchase(pkg.id)}
                disabled={loading === pkg.id}
                className="relative rounded-2xl bg-card border border-border p-4 text-left hover:border-primary/50 transition-colors disabled:opacity-50"
              >
                {pkg.offer_label && (
                  <span className="absolute -top-2 -right-2 px-2 py-0.5 rounded-full text-[10px] font-bold gradient-warm text-primary-foreground">
                    {pkg.offer_label}
                  </span>
                )}
                <p className="font-heading font-bold text-lg">{pkg.points}</p>
                <p className="text-xs text-muted-foreground">points</p>
                <p className="text-sm font-semibold text-primary mt-2">₹{pkg.price_inr}</p>
                <p className="text-[10px] text-muted-foreground">{pkg.name}</p>
              </button>
            ))}
          </div>
        </motion.div>

        {/* Transaction History */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <h2 className="font-heading font-semibold mb-3 flex items-center gap-2">
            <History className="w-4 h-4 text-primary" /> Recent Transactions
          </h2>
          {transactions && transactions.length > 0 ? (
            <div className="space-y-2">
              {transactions.map((tx: any) => (
                <div key={tx.id} className="flex items-center justify-between p-3 rounded-xl bg-card border border-border">
                  <div>
                    <p className="text-sm font-medium">{tx.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(tx.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <span className={`font-heading font-bold text-sm ${tx.amount > 0 ? "text-green-400" : "text-destructive"}`}>
                    {tx.amount > 0 ? "+" : ""}{tx.amount}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-6">No transactions yet</p>
          )}
        </motion.div>
      </div>

      <BottomNav />
    </div>
  );
}
