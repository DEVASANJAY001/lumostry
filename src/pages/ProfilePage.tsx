import { useProfile } from "@/hooks/useProfile";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import BottomNav from "@/components/BottomNav";
import PageTransition from "@/components/PageTransition";
import VerifiedBadge from "@/components/VerifiedBadge";
import ImageCropDialog from "@/components/ImageCropDialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { Settings, Edit, Camera, Users, ChevronRight, Wallet, Image as ImageIcon, CheckCircle, Eye, Loader2, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState, useRef, useEffect } from "react";
import { Lock, Plus, Menu, Grid, Film, UserSquare2, ChevronDown } from "lucide-react";
import CreateHighlightModal from "@/components/CreateHighlightModal";
import HighlightViewer from "@/components/HighlightViewer";
import ShareProfileModal from "@/components/ShareProfileModal";

export default function ProfilePage() {
  const { data: profile, refetch: refetchProfile } = useProfile();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [photoIndex, setPhotoIndex] = useState(0);
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [isHighlightModalOpen, setIsHighlightModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [selectedHighlight, setSelectedHighlight] = useState<any | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: followerCount = 0 } = useQuery({
    queryKey: ["follower-count", user?.id],
    queryFn: async () => {
      if (!user) return 0;
      const { count } = await supabase.from("followers").select("*", { count: "exact", head: true })
        .eq("following_id", user.id);
      return count || 0;
    },
    enabled: !!user,
  });

  const { data: followingCount = 0 } = useQuery({
    queryKey: ["following-count", user?.id],
    queryFn: async () => {
      if (!user) return 0;
      const { count } = await supabase.from("followers").select("*", { count: "exact", head: true })
        .eq("follower_id", user.id);
      return count || 0;
    },
    enabled: !!user,
  });

  const { data: postsCount = 0 } = useQuery({
    queryKey: ["user-posts-count", user?.id],
    queryFn: async () => {
      if (!user) return 0;
      const { count } = await supabase.from("posts").select("*", { count: "exact", head: true })
        .eq("user_id", user.id);
      return count || 0;
    },
    enabled: !!user,
  });

  const { data: userNote } = useQuery({
    queryKey: ["user-note", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from("notes")
        .select("*")
        .eq("user_id", user.id)
        .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const { data: userPosts = [] } = useQuery({
    queryKey: ["user-posts-grid", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from("posts")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!user,
  });

  const { data: walletData } = useQuery({
    queryKey: ["wallet-balance", user?.id],
    queryFn: async () => {
      if (!user) return 0;
      const { data } = await supabase.from("wallets").select("balance").eq("user_id", user.id).maybeSingle();
      return data?.balance || 0;
    },
    enabled: !!user,
  });
  const walletBalance = typeof walletData === "number" ? walletData : 0;

  const { data: requestCount = 0 } = useQuery({
    queryKey: ["request-count", user?.id],
    queryFn: async () => {
      if (!user) return 0;
      const { count } = await supabase.from("follow_requests").select("*", { count: "exact", head: true })
        .eq("receiver_id", user.id).eq("status", "pending");
      return count || 0;
    },
    enabled: !!user,
  });

  const { data: highlightsResponse = [], refetch: refetchHighlights } = useQuery({
    queryKey: ["user-highlights", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await (supabase
        .from("highlights" as any)
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false }) as any);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });
  const highlights = (highlightsResponse as any[]) || [];

  const allPhotos = [
    ...(profile?.avatar_url ? [profile.avatar_url] : []),
    ...(profile?.photos || []),
  ];

  const quickActions = [
    ...(requestCount > 0 ? [{
      icon: Users, label: `${requestCount} follow request${requestCount > 1 ? "s" : ""}`, variant: "highlight" as const,
      onClick: () => navigate("/friend-requests"),
    }] : []),
    { icon: Edit, label: "Edit Profile", onClick: () => navigate("/edit-profile") },
    { icon: ImageIcon, label: "My Gallery", onClick: () => navigate("/my-gallery") },
    { icon: Eye, label: "Profile Visitors", onClick: () => navigate("/profile-visitors") },
    { icon: Wallet, label: `Wallet · ${walletBalance} pts`, onClick: () => navigate("/wallet") },
    ...(!profile?.is_verified ? [{ icon: CheckCircle, label: "Verify Profile", onClick: () => navigate("/verify") }] : []),
  ];

  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.addEventListener("load", () => setCropImageSrc(reader.result?.toString() || null));
      reader.readAsDataURL(file);
    }
    if (e.target) e.target.value = "";
  };

  const handleCropSubmit = async (croppedFile: File) => {
    if (!user) return;
    setCropImageSrc(null);
    setUploadingAvatar(true);
    try {
      const fileExt = croppedFile.name.split(".").pop();
      const filePath = `${user.id}/${crypto.randomUUID()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from("avatars").upload(filePath, croppedFile);
      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from("avatars").getPublicUrl(filePath);
      const { error: updateError } = await supabase.from("profiles").update({ avatar_url: data.publicUrl }).eq("id", profile?.id);
      if (updateError) throw updateError;

      toast.success("Profile photo updated!");
      refetchProfile();
    } catch (error: any) {
      toast.error("Failed to update photo", { description: error.message });
    } finally {
      setUploadingAvatar(false);
    }
  };

  const [activeTab, setActiveTab] = useState<"posts" | "reels" | "tagged">("posts");

  return (
    <PageTransition className="min-h-screen pb-20 bg-background text-foreground">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm px-4 h-12 flex items-center justify-between border-b border-border/40">
        <div className="flex items-center gap-1">
          {profile?.is_private && <Lock className="w-3.5 h-3.5 text-foreground" />}
          <h1 className="text-[17px] font-bold tracking-tight">{profile?.username || "username"}</h1>
          <ChevronDown className="w-4 h-4 opacity-50 ml-0.5" />
        </div>

        <div className="flex items-center gap-5">
          <button onClick={() => navigate("/create")} className="p-0.5 active:opacity-50 transition-opacity">
            <Plus className="w-[26px] h-[26px]" />
          </button>
          <button onClick={() => navigate("/settings")} className="p-0.5 active:opacity-50 transition-opacity">
            <Menu className="w-[26px] h-[26px]" />
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

            <div className="relative group">
              <div className="w-24 h-24 rounded-full p-[3px] bg-gradient-to-tr from-yellow-400 to-fuchsia-600">
                <div className="w-full h-full rounded-full border-2 border-background overflow-hidden relative">
                  <img
                    src={profile?.avatar_url || "https://github.com/shadcn.png"}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                  {uploadingAvatar && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <Loader2 className="w-5 h-5 animate-spin text-white" />
                    </div>
                  )}
                </div>
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-0 right-0 bg-blue-500 text-white p-1.5 rounded-full border-2 border-background shadow-lg active:scale-90 transition-transform"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
            <input type="file" ref={fileInputRef} onChange={handleAvatarSelect} accept="image/*" className="hidden" />
          </div>

          {/* Stats */}
          <div className="flex-1 flex items-center justify-around pl-4">
            <div className="flex flex-col items-center">
              <span className="text-[17px] font-bold leading-tight">{postsCount}</span>
              <span className="text-[13px] text-foreground/80">posts</span>
            </div>
            <div className="flex flex-col items-center cursor-pointer" onClick={() => navigate("/followers")}>
              <span className="text-[17px] font-bold leading-tight">{followerCount}</span>
              <span className="text-[13px] text-foreground/80">followers</span>
            </div>
            <div className="flex flex-col items-center cursor-pointer" onClick={() => navigate("/following")}>
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
        <div className="flex gap-1.5 mb-8">
          <Button
            onClick={() => navigate("/edit-profile")}
            className="flex-1 bg-secondary hover:bg-secondary/90 text-foreground font-semibold text-[13px] h-8 rounded-lg border-0 shadow-none"
          >
            Edit profile
          </Button>
          <Button
            variant="secondary"
            className="flex-1 h-8 text-[13px] font-bold rounded-lg bg-secondary/50 border-0"
            onClick={() => setIsShareModalOpen(true)}
          >
            Share Profile
          </Button>
          <Button
            variant="secondary"
            size="icon"
            className="bg-secondary hover:bg-secondary/90 text-foreground w-8 h-8 rounded-lg border-0 shadow-none"
          >
            <Users className="w-4 h-4" />
          </Button>
        </div>

        {/* Highlights */}
        <div className="flex items-center gap-5 px-1 mb-8 overflow-x-auto scrollbar-hide">
          <div
            className="flex flex-col items-center gap-1.5 flex-shrink-0 group cursor-pointer"
            onClick={() => setIsHighlightModalOpen(true)}
          >
            <div className="w-[62px] h-[62px] rounded-full border border-border/60 flex items-center justify-center p-[3px]">
              <div className="w-full h-full rounded-full bg-secondary/20 flex items-center justify-center">
                <Plus className="w-7 h-7 opacity-60" />
              </div>
            </div>
            <span className="text-[11px] font-medium opacity-80">New</span>
          </div>

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

        {/* Grid */}
        <div className="grid grid-cols-3 gap-0.5 pt-0.5 max-w-lg mx-auto">
          {userPosts.length > 0 ? (
            userPosts.map((post) => (
              <motion.div
                key={post.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="aspect-square bg-secondary relative group cursor-pointer"
                onClick={() => user?.id && navigate(`/user/${user.id}/posts?postId=${post.id}`)}
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
            <div className="col-span-3 py-20 flex flex-col items-center justify-center text-center px-8">
              <div className="w-20 h-20 rounded-full border-2 border-foreground flex items-center justify-center mb-6">
                <Camera className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold mb-2">Create your first post</h3>
              <p className="text-muted-foreground text-sm">Make this space your own.</p>
            </div>
          )}
        </div>
      </div>

      <BottomNav />
      {cropImageSrc && (
        <ImageCropDialog
          imageSrc={cropImageSrc}
          onClose={() => setCropImageSrc(null)}
          onCropSubmit={handleCropSubmit}
          initialAspectRatio={1}
        />
      )}
      <CreateHighlightModal
        isOpen={isHighlightModalOpen}
        onClose={() => setIsHighlightModalOpen(false)}
        onSuccess={() => refetchHighlights()}
      />
      <HighlightViewer
        highlight={selectedHighlight}
        isOpen={!!selectedHighlight}
        onClose={() => setSelectedHighlight(null)}
      />

      {profile?.username && (
        <ShareProfileModal
          isOpen={isShareModalOpen}
          onClose={() => setIsShareModalOpen(false)}
          username={profile.username}
        />
      )}
    </PageTransition>
  );
}
