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
import { motion } from "framer-motion";
import { Settings, Edit, Camera, Users, ChevronRight, Wallet, Image as ImageIcon, CheckCircle, Eye, Loader2, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState, useRef } from "react";

export default function ProfilePage() {
  const { data: profile, refetch: refetchProfile } = useProfile();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [photoIndex, setPhotoIndex] = useState(0);
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: matchCount } = useQuery({
    queryKey: ["match-count", user?.id],
    queryFn: async () => {
      if (!user) return 0;
      const { count } = await supabase.from("matches").select("*", { count: "exact", head: true })
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`);
      return count || 0;
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

  const { data: requestCount } = useQuery({
    queryKey: ["request-count", user?.id],
    queryFn: async () => {
      if (!user) return 0;
      const { count } = await supabase.from("friend_requests").select("*", { count: "exact", head: true })
        .eq("receiver_id", user.id).eq("status", "pending");
      return count || 0;
    },
    enabled: !!user,
  });

  const allPhotos = [
    ...(profile?.avatar_url ? [profile.avatar_url] : []),
    ...(profile?.photos || []),
  ];

  const quickActions = [
    ...(requestCount && requestCount > 0 ? [{
      icon: Users, label: `${requestCount} friend request${requestCount > 1 ? "s" : ""}`, variant: "highlight" as const,
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

  return (
    <PageTransition className="min-h-screen pb-20">
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border px-5 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center transition-all active:scale-90 flex-shrink-0">
            <ArrowLeft className="w-4 h-4 text-foreground" />
          </button>
          <h1 className="text-lg font-heading font-semibold">Profile</h1>
        </div>
        <button onClick={() => navigate("/settings")} className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center">
          <Settings className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      <div className="p-5">
        {/* Photo */}
        {allPhotos.length > 0 ? (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="relative aspect-[4/3] rounded-2xl overflow-hidden mb-5 shadow-card group">
            <img src={allPhotos[photoIndex]} alt="" className="w-full h-full object-cover" />
            <div className="absolute top-3 right-3 z-20">
              <button 
                onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                disabled={uploadingAvatar}
                className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white hover:bg-black/60 transition-colors border border-white/20"
              >
                {uploadingAvatar ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-5 h-5" />}
              </button>
            </div>
            {allPhotos.length > 1 && (
              <>
                <div className="absolute top-3 left-3 right-16 flex gap-1 z-10">
                  {allPhotos.map((_, i) => (
                    <div key={i} className={`h-[2px] flex-1 rounded-full transition-all ${i === photoIndex ? "bg-primary-foreground" : "bg-primary-foreground/25"}`} />
                  ))}
                </div>
                <div className="absolute inset-0 flex z-10">
                  <div className="flex-1" onClick={() => setPhotoIndex(Math.max(0, photoIndex - 1))} />
                  <div className="flex-1" onClick={() => setPhotoIndex(Math.min(allPhotos.length - 1, photoIndex + 1))} />
                </div>
              </>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-background/50 to-transparent pointer-events-none" />
            <input type="file" ref={fileInputRef} onChange={handleAvatarSelect} accept="image/*" className="hidden" />
          </motion.div>
        ) : (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="aspect-[4/3] rounded-2xl bg-secondary flex flex-col items-center justify-center mb-5 border border-dashed border-border cursor-pointer"
            onClick={() => navigate("/edit-profile")}
          >
            <Camera className="w-8 h-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">Add your photos</p>
          </motion.div>
        )}

        {/* Name */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.05 }}>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-heading font-semibold">{profile?.name || profile?.username || "User"}</h2>
            {profile?.age && <span className="text-muted-foreground">{profile.age}</span>}
            {profile?.is_verified && <VerifiedBadge size="sm" verifiedUntil={(profile as any)?.verified_until} />}
          </div>
          {profile?.username && <p className="text-muted-foreground text-sm">@{profile.username}</p>}
          {profile?.bio && <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{profile.bio}</p>}
        </motion.div>

        {/* Stats */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="grid grid-cols-3 gap-2.5 mt-5">
          {[
            { value: matchCount || 0, label: "Matches", color: "text-primary" },
            { value: allPhotos.length, label: "Photos", color: "text-foreground" },
            { value: profile?.interests?.length || 0, label: "Interests", color: "text-foreground" },
          ].map((stat) => (
            <div key={stat.label} className="rounded-xl bg-card border border-border p-3 text-center shadow-card">
              <p className={`text-lg font-heading font-semibold ${stat.color}`}>{stat.value}</p>
              <p className="text-[11px] text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </motion.div>

        {/* Interests */}
        {profile?.interests && profile.interests.length > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }} className="mt-5">
            <h3 className="font-heading font-medium text-sm mb-2">Interests</h3>
            <div className="flex flex-wrap gap-1.5">
              {profile.interests.map((i) => (
                <span key={i} className="px-3 py-1 rounded-full text-xs bg-primary/8 text-primary font-medium border border-primary/10">{i}</span>
              ))}
            </div>
          </motion.div>
        )}

        {/* Quick actions */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="mt-5 space-y-1.5">
          {quickActions.map((action, idx) => (
            <button
              key={idx}
              onClick={action.onClick}
              className={`w-full flex items-center gap-3 p-3.5 rounded-xl text-left transition-all active:scale-[0.98] ${
                action.variant === "highlight"
                  ? "bg-primary/8 border border-primary/15"
                  : "bg-card border border-border hover:bg-secondary/50"
              }`}
            >
              <action.icon className={`w-4 h-4 ${action.variant === "highlight" ? "text-primary" : "text-muted-foreground"}`} />
              <span className="flex-1 text-sm font-medium">{action.label}</span>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </button>
          ))}
        </motion.div>
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
    </PageTransition>
  );
}
