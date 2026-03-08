import { useProfile } from "@/hooks/useProfile";
import { useAuth } from "@/contexts/AuthContext";
import BottomNav from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { LogOut, Settings, Edit, Shield } from "lucide-react";
import { useNavigate } from "react-router-dom";

const GENDER_LABELS: Record<string, string> = {
  male: "Male",
  female: "Female",
  non_binary: "Non-binary",
  prefer_not_to_say: "Prefer not to say",
};

export default function ProfilePage() {
  const { data: profile } = useProfile();
  const { signOut } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen pb-20">
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border px-4 py-3 flex items-center justify-between">
        <h1 className="text-xl font-heading font-bold text-gradient">Profile</h1>
        <button onClick={() => navigate("/settings")} className="p-2">
          <Settings className="w-5 h-5 text-muted-foreground" />
        </button>
      </div>

      <div className="p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center"
        >
          <div className="relative">
            <div className="w-28 h-28 rounded-full overflow-hidden bg-secondary ring-4 ring-primary/20">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-4xl">
                  {profile?.gender === "female" ? "👩" : profile?.gender === "male" ? "👨" : "🧑"}
                </div>
              )}
            </div>
            <div className="absolute bottom-1 right-1 w-4 h-4 rounded-full bg-success border-2 border-background" />
          </div>

          <h2 className="text-2xl font-heading font-bold mt-4">
            {profile?.name || profile?.username || "User"}
          </h2>
          {profile?.username && (
            <p className="text-muted-foreground text-sm">@{profile.username}</p>
          )}
          {profile?.bio && (
            <p className="text-sm text-center mt-3 max-w-xs text-muted-foreground">{profile.bio}</p>
          )}
        </motion.div>

        {/* Info cards */}
        <div className="grid grid-cols-3 gap-3 mt-8">
          {profile?.age && (
            <div className="rounded-xl bg-card border border-border p-3 text-center">
              <p className="text-lg font-heading font-bold">{profile.age}</p>
              <p className="text-xs text-muted-foreground">Age</p>
            </div>
          )}
          {profile?.gender && (
            <div className="rounded-xl bg-card border border-border p-3 text-center">
              <p className="text-lg font-heading font-bold">
                {profile.gender === "female" ? "👩" : profile.gender === "male" ? "👨" : "🌈"}
              </p>
              <p className="text-xs text-muted-foreground">{GENDER_LABELS[profile.gender]}</p>
            </div>
          )}
          <div className="rounded-xl bg-card border border-border p-3 text-center">
            <p className="text-lg font-heading font-bold">{profile?.interests?.length || 0}</p>
            <p className="text-xs text-muted-foreground">Interests</p>
          </div>
        </div>

        {/* Interests */}
        {profile?.interests && profile.interests.length > 0 && (
          <div className="mt-6">
            <h3 className="font-heading font-semibold mb-3">Interests</h3>
            <div className="flex flex-wrap gap-2">
              {profile.interests.map((i) => (
                <span key={i} className="px-3 py-1.5 rounded-full text-sm bg-primary/10 text-primary font-medium">
                  {i}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="mt-8 space-y-3">
          <Button
            variant="outline"
            className="w-full justify-start h-12 rounded-xl"
            onClick={() => navigate("/onboarding")}
          >
            <Edit className="w-4 h-4 mr-3" /> Edit Profile
          </Button>
          <Button
            variant="outline"
            className="w-full justify-start h-12 rounded-xl text-destructive hover:text-destructive"
            onClick={signOut}
          >
            <LogOut className="w-4 h-4 mr-3" /> Sign Out
          </Button>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
