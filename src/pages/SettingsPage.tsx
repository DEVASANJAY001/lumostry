import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/useProfile";
import { useNavigate } from "react-router-dom";
import BottomNav from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import {
  ArrowLeft, Edit, LogOut, Shield, Bell, Eye, HelpCircle, Heart,
  CheckCircle, ChevronRight, Camera,
} from "lucide-react";

export default function SettingsPage() {
  const { signOut, user } = useAuth();
  const { data: profile } = useProfile();
  const navigate = useNavigate();

  const menuItems = [
    {
      section: "Account",
      items: [
        { icon: Edit, label: "Edit Profile", desc: "Update your photos and info", onClick: () => navigate("/edit-profile") },
        { icon: Camera, label: "Manage Photos", desc: "Add or remove gallery photos", onClick: () => navigate("/edit-profile") },
        { icon: Shield, label: "Verify Profile", desc: profile?.is_verified ? "Verified ✓" : "Get the blue badge", onClick: () => navigate("/verify") },
      ],
    },
    {
      section: "Preferences",
      items: [
        { icon: Heart, label: "Dating Preferences", desc: "Gender, age range", onClick: () => navigate("/edit-profile") },
        { icon: Bell, label: "Notifications", desc: "Push & email settings", onClick: () => {} },
        { icon: Eye, label: "Privacy", desc: "Who can see your profile", onClick: () => {} },
      ],
    },
    {
      section: "Support",
      items: [
        { icon: HelpCircle, label: "Help Center", desc: "FAQ & contact support", onClick: () => {} },
        { icon: Shield, label: "Safety Tips", desc: "Stay safe while dating", onClick: () => {} },
      ],
    },
    {
      section: "Legal",
      items: [
        { icon: Shield, label: "Terms & Conditions", desc: "Read our terms of service", onClick: () => navigate("/terms") },
      ],
    },
  ];

  return (
    <div className="min-h-screen pb-20">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)}>
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-heading font-bold">Settings</h1>
      </div>

      {/* Profile summary */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-4"
      >
        <div
          className="flex items-center gap-4 p-4 rounded-2xl bg-card border border-border cursor-pointer hover:bg-secondary/50 transition-colors"
          onClick={() => navigate("/profile")}
        >
          <div className="relative">
            <div className="w-16 h-16 rounded-full overflow-hidden bg-secondary">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-3xl">
                  {profile?.gender === "female" ? "👩" : profile?.gender === "male" ? "👨" : "🧑"}
                </div>
              )}
            </div>
            {profile?.is_verified && (
              <CheckCircle className="absolute -bottom-0.5 -right-0.5 w-5 h-5 text-primary fill-background" />
            )}
          </div>
          <div className="flex-1">
            <h3 className="font-heading font-semibold">{profile?.name || "User"}</h3>
            <p className="text-sm text-muted-foreground">
              {profile?.username ? `@${profile.username}` : user?.email}
            </p>
          </div>
          <ChevronRight className="w-5 h-5 text-muted-foreground" />
        </div>
      </motion.div>

      {/* Menu sections */}
      <div className="px-4 space-y-6">
        {menuItems.map((section, si) => (
          <motion.div
            key={section.section}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: si * 0.05 }}
          >
            <h3 className="text-xs uppercase text-muted-foreground font-semibold tracking-wider mb-2 px-1">
              {section.section}
            </h3>
            <div className="rounded-2xl border border-border bg-card overflow-hidden divide-y divide-border">
              {section.items.map((item) => (
                <button
                  key={item.label}
                  onClick={item.onClick}
                  className="w-full flex items-center gap-3 p-4 hover:bg-secondary/50 transition-colors text-left"
                >
                  <div className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center">
                    <item.icon className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{item.label}</p>
                    <p className="text-xs text-muted-foreground">{item.desc}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                </button>
              ))}
            </div>
          </motion.div>
        ))}

        {/* Sign out */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Button
            variant="outline"
            onClick={signOut}
            className="w-full h-12 rounded-2xl text-destructive hover:text-destructive border-destructive/20 hover:bg-destructive/5"
          >
            <LogOut className="w-4 h-4 mr-2" /> Sign Out
          </Button>
        </motion.div>

        <p className="text-center text-xs text-muted-foreground pb-4">
          Connectly v1.0 • Made with 💖
        </p>
      </div>

      <BottomNav />
    </div>
  );
}
