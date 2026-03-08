import { useProfile } from "@/hooks/useProfile";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import BottomNav from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { LogOut, Settings, Edit, CheckCircle, Camera, Users, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState } from "react";

const GENDER_LABELS: Record<string, string> = {
  male: "Male",
  female: "Female",
  non_binary: "Non-binary",
  prefer_not_to_say: "Prefer not to say",
};

export default function ProfilePage() {
  const { data: profile } = useProfile();
  const { signOut, user } = useAuth();
  const navigate = useNavigate();
  const [photoIndex, setPhotoIndex] = useState(0);

  // Get match count
  const { data: matchCount } = useQuery({
    queryKey: ["match-count", user?.id],
    queryFn: async () => {
      if (!user) return 0;
      const { count } = await supabase
        .from("matches")
        .select("*", { count: "exact", head: true })
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`);
      return count || 0;
    },
    enabled: !!user,
  });

  // Get pending friend request count
  const { data: requestCount } = useQuery({
    queryKey: ["request-count", user?.id],
    queryFn: async () => {
      if (!user) return 0;
      const { count } = await supabase
        .from("friend_requests")
        .select("*", { count: "exact", head: true })
        .eq("receiver_id", user.id)
        .eq("status", "pending");
      return count || 0;
    },
    enabled: !!user,
  });

  const allPhotos = [
    ...(profile?.avatar_url ? [profile.avatar_url] : []),
    ...(profile?.photos || []),
  ];

  return (
    <div className="min-h-screen pb-20">
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border px-4 py-3 flex items-center justify-between">
        <h1 className="text-xl font-heading font-bold text-gradient">Profile</h1>
        <button onClick={() => navigate("/settings")} className="p-2">
          <Settings className="w-5 h-5 text-muted-foreground" />
        </button>
      </div>

      <div className="p-5">
        {/* Photo gallery at top */}
        {allPhotos.length > 0 ? (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="relative aspect-[4/3] rounded-3xl overflow-hidden mb-6">
            <img src={allPhotos[photoIndex]} alt="" className="w-full h-full object-cover" />
            {allPhotos.length > 1 && (
              <>
                <div className="absolute top-3 left-3 right-3 flex gap-1 z-10">
                  {allPhotos.map((_, i) => (
                    <div
                      key={i}
                      className={`h-0.5 flex-1 rounded-full transition-all ${
                        i === photoIndex ? "bg-primary-foreground" : "bg-primary-foreground/30"
                      }`}
                    />
                  ))}
                </div>
                <div className="absolute inset-0 flex z-10">
                  <div className="flex-1" onClick={() => setPhotoIndex(Math.max(0, photoIndex - 1))} />
                  <div className="flex-1" onClick={() => setPhotoIndex(Math.min(allPhotos.length - 1, photoIndex + 1))} />
                </div>
              </>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-background/60 to-transparent pointer-events-none" />
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="aspect-[4/3] rounded-3xl bg-secondary flex flex-col items-center justify-center mb-6 border-2 border-dashed border-border cursor-pointer"
            onClick={() => navigate("/edit-profile")}
          >
            <Camera className="w-10 h-10 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">Add photos to your profile</p>
          </motion.div>
        )}

        {/* Name & info */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-heading font-bold">
              {profile?.name || profile?.username || "User"}
            </h2>
            {profile?.age && <span className="text-lg text-muted-foreground">{profile.age}</span>}
            {profile?.is_verified && <CheckCircle className="w-5 h-5 text-primary" />}
          </div>
          {profile?.username && (
            <p className="text-muted-foreground text-sm">@{profile.username}</p>
          )}
          {profile?.bio && (
            <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{profile.bio}</p>
          )}
        </motion.div>

        {/* Stats */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="grid grid-cols-3 gap-3 mt-6">
          <div className="rounded-2xl bg-card border border-border p-3 text-center">
            <p className="text-xl font-heading font-bold text-primary">{matchCount || 0}</p>
            <p className="text-xs text-muted-foreground">Matches</p>
          </div>
          <div className="rounded-2xl bg-card border border-border p-3 text-center">
            <p className="text-xl font-heading font-bold">{allPhotos.length}</p>
            <p className="text-xs text-muted-foreground">Photos</p>
          </div>
          <div className="rounded-2xl bg-card border border-border p-3 text-center">
            <p className="text-xl font-heading font-bold">{profile?.interests?.length || 0}</p>
            <p className="text-xs text-muted-foreground">Interests</p>
          </div>
        </motion.div>

        {/* Interests */}
        {profile?.interests && profile.interests.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="mt-6">
            <h3 className="font-heading font-semibold mb-3 text-sm">Interests</h3>
            <div className="flex flex-wrap gap-2">
              {profile.interests.map((i) => (
                <span key={i} className="px-3 py-1.5 rounded-full text-xs bg-primary/10 text-primary font-medium">
                  {i}
                </span>
              ))}
            </div>
          </motion.div>
        )}

        {/* Quick actions */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="mt-6 space-y-2">
          {requestCount && requestCount > 0 ? (
            <button
              onClick={() => navigate("/friend-requests")}
              className="w-full flex items-center gap-3 p-4 rounded-2xl bg-primary/10 border border-primary/20 hover:bg-primary/15 transition-colors"
            >
              <Users className="w-5 h-5 text-primary" />
              <span className="flex-1 text-left text-sm font-medium">
                {requestCount} pending friend request{requestCount > 1 ? "s" : ""}
              </span>
              <ChevronRight className="w-4 h-4 text-primary" />
            </button>
          ) : null}

          <Button
            variant="outline"
            className="w-full justify-start h-12 rounded-2xl"
            onClick={() => navigate("/edit-profile")}
          >
            <Edit className="w-4 h-4 mr-3" /> Edit Profile
          </Button>

          {!profile?.is_verified && (
            <Button
              variant="outline"
              className="w-full justify-start h-12 rounded-2xl border-primary/20 text-primary hover:text-primary"
              onClick={() => navigate("/verify")}
            >
              <CheckCircle className="w-4 h-4 mr-3" /> Verify Profile
            </Button>
          )}

          <Button
            variant="outline"
            className="w-full justify-start h-12 rounded-2xl text-destructive hover:text-destructive border-destructive/20"
            onClick={signOut}
          >
            <LogOut className="w-4 h-4 mr-3" /> Sign Out
          </Button>
        </motion.div>
      </div>

      <BottomNav />
    </div>
  );
}
