import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/useProfile";
import { useTheme } from "@/contexts/ThemeContext";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import BottomNav from "@/components/BottomNav";
import PageTransition from "@/components/PageTransition";
import VerifiedBadge from "@/components/VerifiedBadge";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  ArrowLeft, Edit, LogOut, Shield, Bell, Eye, HelpCircle, Heart,
  ChevronRight, Camera, Trash2, Sparkles, Sun, Moon,
} from "lucide-react";

export default function SettingsPage() {
  const { signOut, user } = useAuth();
  const { data: profile } = useProfile();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");
      const res = await supabase.functions.invoke("delete-account");
      if (res.error) throw res.error;
      await signOut();
      toast.success("Account deleted. We're sorry to see you go 😢");
    } catch (err: any) {
      toast.error(err.message || "Failed to delete account");
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

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
    <PageTransition className="min-h-screen pb-20">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)}>
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-heading font-bold flex-1">Settings</h1>

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center transition-all hover:bg-muted active:scale-90"
        >
          <motion.div
            key={theme}
            initial={{ rotate: -90, opacity: 0 }}
            animate={{ rotate: 0, opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            {theme === "dark" ? (
              <Sun className="w-5 h-5 text-foreground" />
            ) : (
              <Moon className="w-5 h-5 text-foreground" />
            )}
          </motion.div>
        </button>
      </div>

      {/* Profile summary */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-4">
        <div
          className="flex items-center gap-4 p-4 rounded-2xl glass-card cursor-pointer hover:shadow-card transition-all"
          onClick={() => navigate("/profile")}
        >
          <div className="relative">
            <div className="w-16 h-16 rounded-full overflow-hidden bg-secondary ring-2 ring-primary/20">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-3xl">
                  {profile?.gender === "female" ? "👩" : profile?.gender === "male" ? "👨" : "🧑"}
                </div>
              )}
            </div>
            {profile?.is_verified && (
              <div className="absolute -bottom-0.5 -right-0.5">
                <VerifiedBadge size="sm" />
              </div>
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
                  className="w-full flex items-center gap-3 p-4 hover:bg-secondary/50 transition-colors text-left active:scale-[0.98]"
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

        {/* Theme info card */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <div className="rounded-2xl border border-border bg-card p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center">
              {theme === "dark" ? <Moon className="w-4 h-4 text-primary-foreground" /> : <Sun className="w-4 h-4 text-primary-foreground" />}
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">Appearance</p>
              <p className="text-xs text-muted-foreground">{theme === "dark" ? "Dark mode" : "Light mode"}</p>
            </div>
            <button
              onClick={toggleTheme}
              className="px-4 py-1.5 rounded-full bg-secondary text-xs font-medium hover:bg-muted transition-colors"
            >
              Switch to {theme === "dark" ? "light" : "dark"}
            </button>
          </div>
        </motion.div>

        {/* Sign out */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="space-y-2">
          <Button
            variant="outline"
            onClick={signOut}
            className="w-full h-12 rounded-2xl text-destructive hover:text-destructive border-destructive/20 hover:bg-destructive/5"
          >
            <LogOut className="w-4 h-4 mr-2" /> Sign Out
          </Button>
          <Button
            variant="ghost"
            onClick={() => setShowDeleteConfirm(true)}
            className="w-full h-10 rounded-2xl text-destructive/60 hover:text-destructive text-xs"
          >
            <Trash2 className="w-3 h-3 mr-1" /> Delete Account
          </Button>
        </motion.div>

        <p className="text-center text-xs text-muted-foreground pb-4">
          Lumos v2.0 • Made with ✨
        </p>
      </div>

      {/* Delete Account Confirmation */}
      {showDeleteConfirm && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowDeleteConfirm(false)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-2xl bg-card border border-destructive/30 p-6 shadow-elevated"
          >
            <div className="text-center mb-4">
              <Trash2 className="w-12 h-12 text-destructive mx-auto mb-3" />
              <h2 className="text-lg font-heading font-bold">Delete Account?</h2>
              <p className="text-sm text-muted-foreground mt-2">
                This will permanently delete your profile, matches, messages, and all data. This action cannot be undone.
              </p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setShowDeleteConfirm(false)} className="flex-1 rounded-xl">
                Cancel
              </Button>
              <Button
                onClick={handleDeleteAccount}
                disabled={deleting}
                className="flex-1 rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deleting ? <Sparkles className="w-4 h-4 animate-spin" /> : "Delete Forever"}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}

      <BottomNav />
    </PageTransition>
  );
}
