import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { motion } from "framer-motion";
import { ArrowLeft, Heart, UserPlus, Shield, MessageCircle, Flag, Image } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import type { Profile } from "@/hooks/useProfile";
import { useState } from "react";
import ReportUserModal from "@/components/ReportUserModal";
import PageTransition from "@/components/PageTransition";
import VerifiedBadge from "@/components/VerifiedBadge";

export default function ViewProfilePage() {
  const { userId } = useParams<{ userId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showReport, setShowReport] = useState(false);
  const [photoIndex, setPhotoIndex] = useState(0);

  const { data: profile } = useQuery({
    queryKey: ["view-profile", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", userId!)
        .single();
      return data as Profile;
    },
    enabled: !!userId,
  });

  // Track profile visit
  useQuery({
    queryKey: ["track-visit", user?.id, userId],
    queryFn: async () => {
      if (!user || !userId || user.id === userId) return null;
      await supabase.from("profile_visitors" as any).upsert(
        { profile_user_id: userId, visitor_user_id: user.id, visited_at: new Date().toISOString() } as any,
        { onConflict: "profile_user_id,visitor_user_id" }
      );
      return true;
    },
    enabled: !!user && !!userId && user.id !== userId,
    staleTime: Infinity,
  });

  const { data: isMatched } = useQuery({
    queryKey: ["is-matched", user?.id, userId],
    queryFn: async () => {
      if (!user || !userId) return false;
      const { data } = await supabase
        .from("matches")
        .select("id")
        .or(`and(user1_id.eq.${user.id},user2_id.eq.${userId}),and(user1_id.eq.${userId},user2_id.eq.${user.id})`)
        .maybeSingle();
      return !!data;
    },
    enabled: !!user && !!userId,
  });

  const likeMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("likes")
        .insert({ liker_id: user!.id, liked_id: userId! });
      if (error && error.code !== "23505") throw error;
      toast.success("Liked! 💖");
    },
  });

  const friendMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("friend_requests")
        .insert({ sender_id: user!.id, receiver_id: userId! });
      if (error) throw error;
      toast.success("Friend request sent! 👋");
    },
  });

  const blockMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("blocked_users")
        .insert({ blocker_id: user!.id, blocked_id: userId! });
      if (error) throw error;
      toast.success("User blocked");
      navigate(-1);
    },
  });

  if (!profile) return null;

  const allPhotos = [
    ...(profile.avatar_url ? [profile.avatar_url] : []),
    ...(profile.photos || []),
  ];

  const GENDER_LABELS: Record<string, string> = {
    male: "Male", female: "Female", non_binary: "Non-binary", prefer_not_to_say: "Prefer not to say",
  };

  return (
    <PageTransition className="min-h-screen">
      {/* Photo carousel */}
      <div className="relative aspect-[3/4] max-h-[60vh]">
        <button
          onClick={() => navigate(-1)}
          className="absolute top-4 left-4 z-20 w-10 h-10 rounded-full bg-background/50 backdrop-blur-xl flex items-center justify-center shadow-card"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        {allPhotos.length > 0 ? (
          <>
            <motion.img
              key={photoIndex}
              src={allPhotos[photoIndex]}
              alt=""
              className="w-full h-full object-cover"
              initial={{ opacity: 0.8 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.25 }}
            />
            {allPhotos.length > 1 && (
              <div className="absolute top-4 left-16 right-4 flex gap-1 z-10">
                {allPhotos.map((_, i) => (
                  <div
                    key={i}
                    className={`h-[3px] flex-1 rounded-full transition-all duration-300 ${
                      i === photoIndex ? "bg-primary-foreground shadow-glow" : "bg-primary-foreground/25"
                    }`}
                  />
                ))}
              </div>
            )}
            <div className="absolute inset-0 flex z-10">
              <div className="flex-1" onClick={() => setPhotoIndex(Math.max(0, photoIndex - 1))} />
              <div className="flex-1" onClick={() => setPhotoIndex(Math.min(allPhotos.length - 1, photoIndex + 1))} />
            </div>
          </>
        ) : (
          <div className="w-full h-full bg-secondary flex items-center justify-center text-8xl">
            {profile.gender === "female" ? "👩" : profile.gender === "male" ? "👨" : "🧑"}
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent pointer-events-none" />
      </div>

      {/* Profile info - glassmorphism card */}
      <div className="p-5 -mt-16 relative z-10">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-heading font-bold">
              {profile.name || profile.username}
            </h1>
            {profile.age && (
              <span className="text-xl text-muted-foreground">{profile.age}</span>
            )}
            {profile.is_verified && <VerifiedBadge size="md" />}
          </div>

          {profile.username && (
            <p className="text-muted-foreground text-sm">@{profile.username}</p>
          )}

          <div className="flex items-center gap-2 mt-2">
            <div className={`w-2.5 h-2.5 rounded-full ${profile.is_online ? "bg-success animate-pulse" : "bg-muted-foreground"}`} />
            <span className="text-xs text-muted-foreground">
              {profile.is_online ? "Online now" : "Offline"}
            </span>
            {profile.gender && (
              <>
                <span className="text-xs text-muted-foreground">•</span>
                <span className="text-xs text-muted-foreground">{GENDER_LABELS[profile.gender]}</span>
              </>
            )}
          </div>
        </motion.div>

        {/* Bio */}
        {profile.bio && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
            <div className="mt-4 p-4 rounded-2xl glass-card">
              <p className="text-sm text-foreground/80 leading-relaxed">{profile.bio}</p>
            </div>
          </motion.div>
        )}

        {/* Interests */}
        {profile.interests && profile.interests.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mt-4">
            <h3 className="font-heading font-semibold text-sm mb-2">Interests</h3>
            <div className="flex flex-wrap gap-2">
              {profile.interests.map((i) => (
                <motion.span
                  key={i}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="px-3.5 py-1.5 rounded-full text-xs bg-primary/10 text-primary font-medium border border-primary/20"
                >
                  {i}
                </motion.span>
              ))}
            </div>
          </motion.div>
        )}

        {/* Action buttons */}
        {user?.id !== userId && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="mt-6 space-y-3">
            <div className="flex gap-3">
              <Button
                onClick={() => likeMutation.mutate()}
                disabled={likeMutation.isPending}
                className="flex-1 h-12 rounded-2xl gradient-primary text-primary-foreground shadow-glow"
              >
                <Heart className="w-4 h-4 mr-2" fill="currentColor" /> Like
              </Button>
              <Button
                onClick={() => friendMutation.mutate()}
                disabled={friendMutation.isPending}
                variant="outline"
                className="flex-1 h-12 rounded-2xl"
              >
                <UserPlus className="w-4 h-4 mr-2" /> Add Friend
              </Button>
            </div>

            <Button
              onClick={() => navigate(`/gallery/${userId}`)}
              variant="secondary"
              className="w-full h-12 rounded-2xl"
            >
              <Image className="w-4 h-4 mr-2" /> View Gallery
            </Button>

            <div className="flex gap-3">
              {isMatched ? (
                <Button
                  onClick={() => navigate(`/chat/${userId}`)}
                  variant="secondary"
                  className="flex-1 h-12 rounded-2xl"
                >
                  <MessageCircle className="w-4 h-4 mr-2" /> Message
                </Button>
              ) : (
                <div className="flex-1 text-center py-3 rounded-2xl bg-secondary text-muted-foreground text-sm">
                  Match to unlock chat 💬
                </div>
              )}
              <Button
                onClick={() => blockMutation.mutate()}
                variant="outline"
                className="h-12 rounded-2xl text-destructive hover:text-destructive border-destructive/20"
              >
                <Shield className="w-4 h-4" />
              </Button>
              <Button
                onClick={() => setShowReport(true)}
                variant="outline"
                className="h-12 rounded-2xl text-destructive hover:text-destructive border-destructive/20"
              >
                <Flag className="w-4 h-4" />
              </Button>
            </div>
          </motion.div>
        )}
      </div>

      <ReportUserModal
        reportedUserId={userId!}
        reportedUserName={profile.name || profile.username || "User"}
        isOpen={showReport}
        onClose={() => setShowReport(false)}
      />
    </PageTransition>
  );
}
