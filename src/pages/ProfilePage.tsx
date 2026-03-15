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
import { Settings, Edit, Camera, Users, Wallet, Image as ImageIcon, CheckCircle, Eye, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState, useRef } from "react";
import { Lock, Plus, Menu, Grid, Film, UserSquare2, ChevronDown, Share2, Bookmark } from "lucide-react";
import CreateHighlightModal from "@/components/CreateHighlightModal";
import HighlightViewer from "@/components/HighlightViewer";
import ShareProfileModal from "@/components/ShareProfileModal";

export default function ProfilePage() {
  const { data: profile, refetch: refetchProfile } = useProfile();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [isHighlightModalOpen, setIsHighlightModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [selectedHighlight, setSelectedHighlight] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState<"posts" | "reels" | "tagged">("posts");
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

  const filteredPosts = userPosts.filter(post => {
    if (activeTab === "reels") return post.media_type === "reel" || post.media_type === "video";
    if (activeTab === "posts") return post.media_type === "image" || !post.media_type || post.media_type === "reel" || post.media_type === "video";
    return true;
  });

  return (
    <PageTransition className="min-h-screen pb-20 bg-background text-foreground">
      {/* Minimal Header */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border/30">
        <div className="flex items-center justify-between px-4 h-11">
          <div className="flex items-center gap-1.5">
            {profile?.is_private && <Lock className="w-3 h-3 text-muted-foreground" />}
            <h1 className="text-[15px] font-bold tracking-tight font-heading">{profile?.username || "username"}</h1>
            {profile?.is_verified && <VerifiedBadge size="xs" />}
            <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => navigate("/create")} className="active:scale-90 transition-transform">
              <Plus className="w-6 h-6" />
            </button>
            <button onClick={() => navigate("/settings")} className="active:scale-90 transition-transform">
              <Menu className="w-6 h-6" />
            </button>
          </div>
        </div>
      </div>

      {/* Profile Hero */}
      <div className="px-4 pt-5 pb-2">
        {/* Avatar + Stats Row */}
        <div className="flex items-start gap-6 mb-4">
          {/* Avatar */}
          <div className="relative flex-shrink-0">
            <AnimatePresence>
              {userNote && (
                <motion.div
                  initial={{ scale: 0, opacity: 0, y: 8 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  exit={{ scale: 0, opacity: 0 }}
                  className="absolute -top-10 left-1/2 -translate-x-1/2 z-10"
                >
                  <div className="relative bg-card border border-border/60 rounded-xl px-2.5 py-1.5 shadow-lg max-w-[100px]">
                    <p className="text-[10px] leading-tight text-center font-medium line-clamp-2 text-foreground/80">
                      {userNote.content}
                    </p>
                    <div className="absolute -bottom-[5px] left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-card border-r border-b border-border/60 rotate-45" />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="relative group"
            >
              <div className="w-20 h-20 rounded-full p-[2.5px] bg-gradient-to-br from-primary via-accent to-primary">
                <div className="w-full h-full rounded-full border-[2.5px] border-background overflow-hidden">
                  <img
                    src={profile?.avatar_url || "https://github.com/shadcn.png"}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                  {uploadingAvatar && (
                    <div className="absolute inset-0 rounded-full bg-background/50 flex items-center justify-center">
                      <Loader2 className="w-5 h-5 animate-spin text-primary" />
                    </div>
                  )}
                </div>
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center border-2 border-background shadow-sm">
                <Plus className="w-3 h-3 stroke-[3]" />
              </div>
            </button>
            <input type="file" ref={fileInputRef} onChange={handleAvatarSelect} accept="image/*" className="hidden" />
          </div>

          {/* Stats */}
          <div className="flex-1 flex items-center justify-around pt-2">
            <button className="flex flex-col items-center gap-0.5 active:opacity-60 transition-opacity">
              <span className="text-lg font-bold leading-none">{postsCount}</span>
              <span className="text-[11px] text-muted-foreground">Posts</span>
            </button>
            <button onClick={() => navigate("/followers")} className="flex flex-col items-center gap-0.5 active:opacity-60 transition-opacity">
              <span className="text-lg font-bold leading-none">{followerCount}</span>
              <span className="text-[11px] text-muted-foreground">Followers</span>
            </button>
            <button onClick={() => navigate("/following")} className="flex flex-col items-center gap-0.5 active:opacity-60 transition-opacity">
              <span className="text-lg font-bold leading-none">{followingCount}</span>
              <span className="text-[11px] text-muted-foreground">Following</span>
            </button>
          </div>
        </div>

        {/* Name & Bio */}
        <div className="mb-3.5 space-y-0.5">
          <h2 className="text-[13px] font-bold leading-tight">{profile?.name || "Your Name"}</h2>
          <p className="text-[13px] leading-[17px] text-foreground/80 whitespace-pre-wrap">{profile?.bio || "✨ Add a bio to tell people about yourself"}</p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-1.5 mb-5">
          <Button
            onClick={() => navigate("/edit-profile")}
            variant="secondary"
            className="flex-1 h-[34px] text-[13px] font-semibold rounded-lg"
          >
            Edit profile
          </Button>
          <Button
            variant="secondary"
            className="flex-1 h-[34px] text-[13px] font-semibold rounded-lg"
            onClick={() => setIsShareModalOpen(true)}
          >
            Share profile
          </Button>
          {requestCount > 0 && (
            <Button
              variant="secondary"
              size="icon"
              className="h-[34px] w-[34px] rounded-lg relative"
              onClick={() => navigate("/friend-requests")}
            >
              <Users className="w-4 h-4" />
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-primary text-primary-foreground text-[9px] font-bold flex items-center justify-center">
                {requestCount}
              </span>
            </Button>
          )}
        </div>

        {/* Quick Actions Row */}
        <div className="flex gap-3 mb-5 overflow-x-auto scrollbar-hide -mx-4 px-4">
          <button onClick={() => navigate("/wallet")} className="flex items-center gap-2 px-3.5 py-2 rounded-full bg-secondary/80 text-[12px] font-medium text-foreground/80 flex-shrink-0 active:scale-95 transition-transform border border-border/30">
            <Wallet className="w-3.5 h-3.5 text-primary" />
            {walletBalance} pts
          </button>
          <button onClick={() => navigate("/my-gallery")} className="flex items-center gap-2 px-3.5 py-2 rounded-full bg-secondary/80 text-[12px] font-medium text-foreground/80 flex-shrink-0 active:scale-95 transition-transform border border-border/30">
            <ImageIcon className="w-3.5 h-3.5 text-accent" />
            Gallery
          </button>
          <button onClick={() => navigate("/profile-visitors")} className="flex items-center gap-2 px-3.5 py-2 rounded-full bg-secondary/80 text-[12px] font-medium text-foreground/80 flex-shrink-0 active:scale-95 transition-transform border border-border/30">
            <Eye className="w-3.5 h-3.5 text-muted-foreground" />
            Visitors
          </button>
          {!profile?.is_verified && (
            <button onClick={() => navigate("/verify")} className="flex items-center gap-2 px-3.5 py-2 rounded-full bg-primary/10 text-[12px] font-medium text-primary flex-shrink-0 active:scale-95 transition-transform border border-primary/20">
              <CheckCircle className="w-3.5 h-3.5" />
              Get Verified
            </button>
          )}
        </div>

        {/* Highlights */}
        <div className="flex items-center gap-4 mb-4 overflow-x-auto scrollbar-hide -mx-4 px-4">
          <button
            className="flex flex-col items-center gap-1 flex-shrink-0"
            onClick={() => setIsHighlightModalOpen(true)}
          >
            <div className="w-16 h-16 rounded-full border border-border/50 flex items-center justify-center">
              <Plus className="w-6 h-6 text-muted-foreground" />
            </div>
            <span className="text-[11px] text-muted-foreground">New</span>
          </button>

          {highlights.map((h: any) => (
            <button
              key={h.id}
              className="flex flex-col items-center gap-1 flex-shrink-0"
              onClick={() => setSelectedHighlight(h)}
            >
              <div className="w-16 h-16 rounded-full p-[2px] bg-border/50">
                <div className="w-full h-full rounded-full overflow-hidden bg-secondary">
                  {h.cover_url ? (
                    <img src={h.cover_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-muted-foreground uppercase">
                      {h.title?.substring(0, 2)}
                    </div>
                  )}
                </div>
              </div>
              <span className="text-[11px] font-medium truncate max-w-[64px]">{h.title}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Content Tabs */}
      <div className="sticky top-11 z-40 bg-background border-y border-border/30">
        <div className="flex">
          {[
            { key: "posts" as const, icon: Grid },
            { key: "reels" as const, icon: Film },
            { key: "tagged" as const, icon: Bookmark },
          ].map(({ key, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex-1 flex justify-center py-2.5 transition-all relative ${
                activeTab === key ? "text-foreground" : "text-muted-foreground"
              }`}
            >
              <Icon className="w-5 h-5" />
              {activeTab === key && (
                <motion.div
                  layoutId="profileTab"
                  className="absolute bottom-0 left-0 right-0 h-[1.5px] bg-foreground"
                />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Posts Grid */}
      <div className="grid grid-cols-3 gap-[1px] bg-border/20">
        {filteredPosts.length > 0 ? (
          filteredPosts.map((post, i) => (
            <motion.div
              key={post.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.03 }}
              className="aspect-square bg-secondary relative cursor-pointer group"
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
              {/* Hover overlay */}
              <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/10 transition-colors" />
            </motion.div>
          ))
        ) : (
          <div className="col-span-3 py-24 flex flex-col items-center justify-center text-center px-8">
            <div className="w-16 h-16 rounded-full border-2 border-foreground/20 flex items-center justify-center mb-4">
              <Camera className="w-7 h-7 text-foreground/20" />
            </div>
            <h3 className="text-lg font-bold mb-1">Share photos</h3>
            <p className="text-muted-foreground text-[13px]">When you share photos, they will appear on your profile.</p>
            <button
              onClick={() => navigate("/create")}
              className="mt-4 text-primary text-[13px] font-bold active:opacity-60"
            >
              Share your first photo
            </button>
          </div>
        )}
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