import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { ArrowLeft, Lock, Unlock, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useState } from "react";

export default function UserGalleryPage() {
  const { userId } = useParams<{ userId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [unlocking, setUnlocking] = useState<string | null>(null);

  const { data: ownerProfile } = useQuery({
    queryKey: ["gallery-owner", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("name, username")
        .eq("user_id", userId!)
        .single();
      return data;
    },
    enabled: !!userId,
  });

  const { data: photos } = useQuery({
    queryKey: ["user-gallery", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("gallery_photos")
        .select("*")
        .eq("user_id", userId!)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!userId,
  });

  const { data: unlocked } = useQuery({
    queryKey: ["my-unlocks", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from("photo_unlocks")
        .select("photo_id")
        .eq("user_id", user.id);
      return (data || []).map((u: any) => u.photo_id);
    },
    enabled: !!user,
  });

  const { data: wallet } = useQuery({
    queryKey: ["wallet", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from("wallets")
        .select("balance")
        .eq("user_id", user.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const handleUnlock = async (photoId: string) => {
    setUnlocking(photoId);
    try {
      const res = await supabase.functions.invoke("unlock-photo", {
        body: { photo_id: photoId },
      });

      if (res.error) throw new Error(res.error.message);
      if (res.data?.error) throw new Error(res.data.error);

      toast.success("Photo unlocked! 🔓");
      queryClient.invalidateQueries({ queryKey: ["my-unlocks"] });
      queryClient.invalidateQueries({ queryKey: ["wallet"] });
    } catch (e: any) {
      if (e.message === "Insufficient points") {
        toast.error("Not enough points! Top up your wallet.", {
          action: { label: "Top Up", onClick: () => navigate("/wallet") },
        });
      } else {
        toast.error(e.message || "Failed to unlock");
      }
    } finally {
      setUnlocking(null);
    }
  };

  const isOwn = user?.id === userId;

  return (
    <div className="min-h-screen pb-20">
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-1">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-heading font-bold">
            {ownerProfile?.name || ownerProfile?.username || "Gallery"}
          </h1>
        </div>
        {!isOwn && (
          <button onClick={() => navigate("/wallet")} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium">
            <Wallet className="w-3.5 h-3.5" />
            {wallet?.balance || 0} pts
          </button>
        )}
      </div>

      <div className="p-4">
        <div className="grid grid-cols-2 gap-3">
          {photos?.map((photo: any, idx: number) => {
            const isUnlocked = photo.points_required === 0 || isOwn || unlocked?.includes(photo.id);

            return (
              <motion.div
                key={photo.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.03 }}
                className="relative rounded-2xl overflow-hidden aspect-square bg-secondary"
              >
                {isUnlocked ? (
                  <img src={photo.photo_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full relative">
                    <img src={photo.photo_url} alt="" className="w-full h-full object-cover blur-xl scale-110" />
                    <div className="absolute inset-0 bg-background/60 backdrop-blur-sm flex flex-col items-center justify-center">
                      <Lock className="w-8 h-8 text-primary mb-2" />
                      <p className="text-sm font-heading font-bold">{photo.points_required} pts</p>
                      <Button
                        size="sm"
                        onClick={() => handleUnlock(photo.id)}
                        disabled={unlocking === photo.id}
                        className="mt-2 rounded-xl gradient-primary text-primary-foreground text-xs"
                      >
                        {unlocking === photo.id ? "Unlocking..." : "Unlock"}
                      </Button>
                    </div>
                  </div>
                )}

                {isUnlocked && photo.points_required > 0 && (
                  <div className="absolute top-2 left-2">
                    <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-green-500/80 backdrop-blur text-[10px] font-bold text-white">
                      <Unlock className="w-3 h-3" /> Unlocked
                    </span>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>

        {photos?.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-10">No gallery photos yet</p>
        )}
      </div>
    </div>
  );
}
