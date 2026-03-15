import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export function useFollow(targetUserId: string | undefined) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: followStatus, isLoading } = useQuery({
    queryKey: ["follow-status", user?.id, targetUserId],
    queryFn: async () => {
      if (!user || !targetUserId) return null;
      
      const { data: following } = await supabase
        .from("followers" as any)
        .select("*")
        .eq("follower_id", user.id)
        .eq("following_id", targetUserId)
        .maybeSingle();

      const { data: request } = await (supabase
        .from("follow_requests" as any)
        .select("*")
        .eq("sender_id", user.id)
        .eq("receiver_id", targetUserId)
        .maybeSingle() as any);

      return {
        isFollowing: !!following,
        hasPendingRequest: (request as any)?.status === "pending",
        requestId: (request as any)?.id
      };
    },
    enabled: !!user && !!targetUserId,
  });

  const followMutation = useMutation({
    mutationFn: async (isPrivate: boolean) => {
      if (!user || !targetUserId) return;

      if (isPrivate) {
        const { error } = await supabase
          .from("follow_requests" as any)
          .insert({ sender_id: user.id, receiver_id: targetUserId, status: "pending" });
        if (error) throw error;
        toast.success("Follow request sent");
      } else {
        const { error } = await supabase
          .from("followers" as any)
          .insert({ follower_id: user.id, following_id: targetUserId });
        if (error) throw error;
        toast.success("Following");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["follow-status", user?.id, targetUserId] });
      queryClient.invalidateQueries({ queryKey: ["posts"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to follow");
    }
  });

  const unfollowMutation = useMutation({
    mutationFn: async () => {
      if (!user || !targetUserId) return;

      const { error: followerError } = await supabase
        .from("followers" as any)
        .delete()
        .eq("follower_id", user.id)
        .eq("following_id", targetUserId);

      if (followerError) throw followerError;

      const { error: requestError } = await supabase
        .from("follow_requests" as any)
        .delete()
        .eq("sender_id", user.id)
        .eq("receiver_id", targetUserId);
      
      if (requestError) throw requestError;
      
      toast.success("Unfollowed");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["follow-status", user?.id, targetUserId] });
      queryClient.invalidateQueries({ queryKey: ["posts"] });
    },
  });

  return {
    followStatus,
    isLoading,
    follow: (isPrivate: boolean) => followMutation.mutate(isPrivate),
    unfollow: () => unfollowMutation.mutate(),
    isPending: followMutation.isPending || unfollowMutation.isPending
  };
}
