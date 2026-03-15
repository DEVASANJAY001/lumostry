import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Heart, UserPlus, Shield, MessageCircle, Flag, Image, Lock, Check, ChevronDown, Plus, Menu, Grid, Film, UserSquare2, MoreVertical, Loader2, Camera } from "lucide-react";
import HighlightViewer from "@/components/HighlightViewer";
import StoryViewer from "@/components/StoryViewer";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import type { Profile } from "@/hooks/useProfile";
import { useState } from "react";
import ReportUserModal from "@/components/ReportUserModal";
import PageTransition from "@/components/PageTransition";
import VerifiedBadge from "@/components/VerifiedBadge";
import { useFollow } from "@/hooks/useFollow";

export default function ViewProfilePage() {
  const { userId } = useParams<{ userId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showReport, setShowReport] = useState(false);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [activeTab, setActiveTab] = useState<"posts" | "reels" | "tagged">("posts");
  const [selectedHighlight, setSelectedHighlight] = useState<any | null>(null);
  const [viewingStoryUserId, setViewingStoryUserId] = useState<string | null>(null);

  const { data: profile } = useQuery({
    queryKey: ["view-profile", userId],
    queryFn: async () => {
      if (!userId) return null;
      let query = supabase.from("profiles").select("*");

      // If userId is a UUID, search by user_id, otherwise by username
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(userId);

      if (isUuid) {
        query = query.eq("user_id", userId);
      } else {
        query = query.eq("username", userId);
      }

      const { data } = await query.maybeSingle();
      return data as Profile;
    },
    enabled: !!userId,
  });

  const effectiveUserId = profile?.user_id;
  const { followStatus, follow, unfollow, isPending: followPending } = useFollow(effectiveUserId);

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

  const { data: followerCount = 0 } = useQuery({
    queryKey: ["follower-count", userId],
    queryFn: async () => {
      if (!userId) return 0;
      const { count } = await supabase.from("followers").select("*", { count: "exact", head: true })
        .eq("following_id", userId);
      return count || 0;
    },
    enabled: !!userId,
  });

  const { data: followingCount = 0 } = useQuery({
    queryKey: ["following-count", userId],
    queryFn: async () => {
      if (!userId) return 0;
      const { count } = await supabase.from("followers").select("*", { count: "exact", head: true })
        .eq("follower_id", userId);
      return count || 0;
    },
    enabled: !!userId,
  });

  const { data: postsCount = 0 } = useQuery({
    queryKey: ["user-posts-count", userId],
    queryFn: async () => {
      if (!userId) return 0;
      const { count } = await supabase.from("posts").select("*", { count: "exact", head: true })
        .eq("user_id", userId);
      return count || 0;
    },
    enabled: !!userId,
  });

  const { data: userNote } = useQuery({
    queryKey: ["user-note", userId],
    queryFn: async () => {
      if (!userId) return null;
      const { data } = await supabase
        .from("notes")
        .select("*")
        .eq("user_id", userId)
        .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
    enabled: !!userId,
  });

  const { data: userPosts = [] } = useQuery({
    queryKey: ["user-posts-grid", userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data } = await supabase
        .from("posts")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!userId,
  });

  const { data: highlights = [] } = useQuery({
    queryKey: ["user-highlights", effectiveUserId],
    queryFn: async () => {
      if (!effectiveUserId) return [];
      const { data, error } = await supabase
        .from("highlights" as any)
        .select("*")
        .eq("user_id", effectiveUserId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!effectiveUserId,
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

  if (profile === undefined) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-10 text-center">
        <Loader2 className="w-10 h-10 animate-spin text-primary opacity-50 mb-4" />
        <p className="text-muted-foreground animate-pulse">Loading profile...</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-10 text-center">
        <div className="w-20 h-20 rounded-full bg-secondary flex items-center justify-center mb-6">
          <UserPlus className="w-10 h-10 text-muted-foreground opacity-20" />
        </div>
        <h3 className="text-xl font-bold mb-2">User not found</h3>
        <p className="text-muted-foreground mb-8">This user may have deleted their account or the link is invalid.</p>
        <Button onClick={() => navigate(-1)} variant="secondary" className="rounded-full px-8">
          Go Back
        </Button>
      </div>
    );
  }

  const isLocked = profile.is_private && !followStatus?.isFollowing && user?.id !== userId;

  const allPhotos = [
    ...(profile.avatar_url ? [profile.avatar_url] : []),
    ...(profile.photos || []),
  ];

  const GENDER_LABELS: Record<string, string> = {
    male: "Male", female: "Female", non_binary: "Non-binary", prefer_not_to_say: "Prefer not to say",
  };

  const getFollowButton = () => {
    if (followStatus?.isFollowing) {
      return (
        <Button
          variant="secondary"
          className="flex-1 h-12 rounded-2xl"
          onClick={() => unfollow()}
          disabled={followPending}
        >
          Following
        </Button>
      );
    }
    if (followStatus?.hasPendingRequest) {
      return (
        <Button
          variant="secondary"
          className="flex-1 h-12 rounded-2xl opacity-70"
          disabled
        >
          Requested
        </Button>
      );
    }
    return (
      <Button
        className="flex-1 h-12 rounded-2xl gradient-primary text-primary-foreground shadow-glow"
        onClick={() => follow(profile.is_private || false)}
        disabled={followPending}
      >
        <UserPlus className="w-4 h-4 mr-2" /> Follow
      </Button>
    );
  };


  return (
    <PageTransition className="min-h-screen pb-20 bg-background text-foreground">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm px-4 h-12 flex items-center justify-between border-b border-border/40">
        <div className="flex items-center gap-2">
          <button onClick={() => navigate(-1)} className="p-0.5 active:opacity-50 transition-opacity">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div className="flex items-center gap-1">
            {profile?.is_private && <Lock className="w-3.5 h-3.5 text-foreground" />}
            <h1 className="text-[17px] font-bold tracking-tight">{profile?.username || "username"}</h1>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button className="p-1 active:opacity-50 transition-opacity">
            <MoreVertical className="w-6 h-6" />
          </button>
        </div>
      </div>

      <div className="px-4 py-6">
        {/* Profile Info Row */}
        <div className="flex items-center justify-between mb-6">
          {/* Avatar with Note */}
          <div className="relative">
            <AnimatePresence>
              {userNote && (
                <motion.div
                  initial={{ scale: 0, opacity: 0, y: 10 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  className="absolute -top-12 left-0 z-10"
                >
                  <div className="relative bg-card border border-border rounded-2xl px-3 py-2 shadow-xl max-w-[120px]">
                    <p className="text-[11px] leading-tight text-center font-medium line-clamp-2">
                      {userNote.content}
                    </p>
                    {/* Tail */}
                    <div className="absolute -bottom-1 left-4 w-2 h-2 bg-card border-r border-b border-border rotate-45" />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div
              className="w-24 h-24 rounded-full p-[3px] bg-gradient-to-tr from-yellow-400 to-fuchsia-600 cursor-pointer active:scale-95 transition-transform"
              onClick={() => setViewingStoryUserId(effectiveUserId!)}
            >
              <div className="w-full h-full rounded-full border-2 border-background overflow-hidden relative">
                <img
                  src={profile?.avatar_url || "https://github.com/shadcn.png"}
                  alt=""
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="flex-1 flex items-center justify-around pl-4">
            <div className="flex flex-col items-center">
              <span className="text-[17px] font-bold leading-tight">{postsCount}</span>
              <span className="text-[13px] text-foreground/80">posts</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-[17px] font-bold leading-tight">{followerCount}</span>
              <span className="text-[13px] text-foreground/80">followers</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-[17px] font-bold leading-tight">{followingCount}</span>
              <span className="text-[13px] text-foreground/80">following</span>
            </div>
          </div>
        </div>

        {/* Bio */}
        <div className="mb-4 space-y-0.5">
          <div className="flex items-center gap-1.5">
            <h2 className="text-[13px] font-bold">{profile?.name || "Lumos User"}</h2>
            {profile?.is_verified && <VerifiedBadge size="xs" />}
          </div>
          <p className="text-[13px] leading-[18px] whitespace-pre-wrap text-foreground/90">{profile?.bio || "No bio yet."}</p>
        </div>

        {/* Action Buttons */}
        {user?.id !== userId && (
          <div className="flex gap-1.5 mb-8">
            {getFollowButton()}
            <Button
              onClick={() => navigate(`/chat/${userId}`)}
              className="flex-1 bg-secondary hover:bg-secondary/90 text-foreground font-semibold text-[13px] h-8 rounded-lg border-0 shadow-none"
            >
              Message
            </Button>
            <Button
              variant="secondary"
              className="flex-1 bg-secondary hover:bg-secondary/90 text-foreground font-semibold text-[13px] h-8 rounded-lg border-0 shadow-none"
              onClick={() => likeMutation.mutate()}
            >
              Like
            </Button>
            <Button
              variant="secondary"
              size="icon"
              className="bg-secondary hover:bg-secondary/90 text-foreground w-8 h-8 rounded-lg border-0 shadow-none"
              onClick={() => setShowReport(true)}
            >
              <Flag className="w-4 h-4" />
            </Button>
          </div>
        )}

        {/* Highlights */}
        <div className="flex items-center gap-5 px-1 mb-8 overflow-x-auto scrollbar-hide">
          {highlights.map((h) => (
            <div
              key={h.id}
              className="flex flex-col items-center gap-1.5 flex-shrink-0 cursor-pointer"
              onClick={() => setSelectedHighlight(h)}
            >
              <div className="w-[62px] h-[62px] rounded-full border border-border/60 p-[3px]">
                <div className="w-full h-full rounded-full bg-secondary/40 overflow-hidden">
                  {h.cover_url ? (
                    <img src={h.cover_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-muted-foreground uppercase">
                      {h.title.substring(0, 2)}
                    </div>
                  )}
                </div>
              </div>
              <span className="text-[11px] font-medium truncate max-w-[66px]">{h.title}</span>
            </div>
          ))}
          {highlights.length === 0 && (
            <div className="flex flex-col items-center gap-1.5 flex-shrink-0 opacity-40">
              <div className="w-[62px] h-[62px] rounded-full border border-border/40 p-[3px]">
                <div className="w-full h-full rounded-full bg-secondary/20" />
              </div>
              <div className="w-10 h-2 bg-secondary/40 rounded" />
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex border-t border-border/40">
          <button
            onClick={() => setActiveTab("posts")}
            className={`flex-1 flex justify-center py-3 border-t-2 transition-colors ${activeTab === "posts" ? "border-foreground" : "border-transparent opacity-40"}`}
          >
            <Grid className="w-6 h-6" />
          </button>
          <button
            onClick={() => setActiveTab("reels")}
            className={`flex-1 flex justify-center py-3 border-t-2 transition-colors ${activeTab === "reels" ? "border-foreground" : "border-transparent opacity-40"}`}
          >
            <Film className="w-6 h-6" />
          </button>
          <button
            onClick={() => setActiveTab("tagged")}
            className={`flex-1 flex justify-center py-3 border-t-2 transition-colors ${activeTab === "tagged" ? "border-foreground" : "border-transparent opacity-40"}`}
          >
            <UserSquare2 className="w-6 h-6" />
          </button>
        </div>

        {/* Grid / Privacy Locker */}
        {isLocked ? (
          <div className="col-span-3 py-20 flex flex-col items-center justify-center text-center px-8">
            <div className="w-20 h-20 rounded-full border-2 border-foreground flex items-center justify-center mb-6">
              <Lock className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold mb-2">This account is private</h3>
            <p className="text-sm text-muted-foreground">Follow this user to see their photos and videos.</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-0.5 pt-0.5 max-w-lg mx-auto">
            {userPosts.length > 0 ? (
              userPosts.map((post) => (
                <motion.div
                  key={post.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="aspect-square bg-secondary relative group cursor-pointer"
                  onClick={() => navigate(`/user/${effectiveUserId}/posts?postId=${post.id}`)}
                >
                  {post.media_type === "video" || post.media_type === "reel" ? (
                    <>
                      <video src={post.media_url} className="w-full h-full object-cover" />
                      <Film className="absolute top-2 right-2 w-4 h-4 text-white drop-shadow-md" />
                    </>
                  ) : (
                    <img src={post.media_url} alt="" className="w-full h-full object-cover" />
                  )}
                </motion.div>
              ))
            ) : (
              <div className="col-span-3 py-24 flex flex-col items-center justify-center text-center px-8">
                <Camera className="w-12 h-12 mb-4 opacity-20" />
                <p className="text-muted-foreground text-sm">No posts yet.</p>
              </div>
            )}
          </div>
        )}
      </div>

      <ReportUserModal
        reportedUserId={userId!}
        reportedUserName={profile?.name || profile?.username || "User"}
        isOpen={showReport}
        onClose={() => setShowReport(false)}
      />

      <HighlightViewer
        highlight={selectedHighlight}
        isOpen={!!selectedHighlight}
        onClose={() => setSelectedHighlight(null)}
      />

      <StoryViewer
        userId={viewingStoryUserId}
        isOpen={!!viewingStoryUserId}
        onClose={() => setViewingStoryUserId(null)}
      />
    </PageTransition>
  );
}
