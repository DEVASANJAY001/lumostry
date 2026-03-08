import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import BottomNav from "@/components/BottomNav";
import { motion } from "framer-motion";
import { ArrowLeft, Check, X, UserPlus } from "lucide-react";
import { toast } from "sonner";
import type { Profile } from "@/hooks/useProfile";

interface FriendRequestWithProfile {
  id: string;
  sender_id: string;
  receiver_id: string;
  status: string;
  created_at: string;
  profile: Profile;
}

export default function FriendRequestsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ["friend-requests", user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data: reqs } = await supabase
        .from("friend_requests")
        .select("*")
        .eq("receiver_id", user.id)
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (!reqs || reqs.length === 0) return [];

      const senderIds = reqs.map((r) => r.sender_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("*")
        .in("user_id", senderIds);

      return reqs.map((req) => ({
        ...req,
        profile: (profiles || []).find((p) => p.user_id === req.sender_id) as Profile,
      })) as FriendRequestWithProfile[];
    },
    enabled: !!user,
  });

  const acceptMutation = useMutation({
    mutationFn: async (requestId: string) => {
      const { error } = await supabase
        .from("friend_requests")
        .update({ status: "accepted" })
        .eq("id", requestId);
      if (error) throw error;
      toast.success("Friend request accepted! 🎉");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["friend-requests"] });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (requestId: string) => {
      const { error } = await supabase
        .from("friend_requests")
        .update({ status: "rejected" })
        .eq("id", requestId);
      if (error) throw error;
      toast("Request declined");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["friend-requests"] });
    },
  });

  return (
    <div className="min-h-screen pb-20">
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)}>
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-heading font-bold">Friend Requests</h1>
      </div>

      <div className="p-4">
        {isLoading ? (
          <div className="text-center py-16">
            <UserPlus className="w-8 h-8 text-primary animate-pulse mx-auto" />
          </div>
        ) : requests.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-4">👋</div>
            <h3 className="text-lg font-heading font-semibold">No pending requests</h3>
            <p className="text-muted-foreground text-sm mt-1">When someone sends you a request, it'll show here</p>
          </div>
        ) : (
          <div className="space-y-3">
            {requests.map((req, i) => (
              <motion.div
                key={req.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex items-center gap-3 p-4 rounded-2xl bg-card border border-border"
              >
                <div
                  className="w-14 h-14 rounded-full overflow-hidden bg-secondary cursor-pointer"
                  onClick={() => navigate(`/user/${req.sender_id}`)}
                >
                  {req.profile?.avatar_url ? (
                    <img src={req.profile.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-2xl">👤</div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-sm truncate">
                    {req.profile?.name || "Someone"}
                  </h4>
                  <p className="text-xs text-muted-foreground">Wants to be your friend</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => acceptMutation.mutate(req.id)}
                    className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center shadow-glow"
                  >
                    <Check className="w-4 h-4 text-primary-foreground" />
                  </button>
                  <button
                    onClick={() => rejectMutation.mutate(req.id)}
                    className="w-10 h-10 rounded-full bg-secondary border border-border flex items-center justify-center"
                  >
                    <X className="w-4 h-4 text-muted-foreground" />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
