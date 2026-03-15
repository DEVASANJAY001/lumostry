import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Home, Search, PlaySquare, Heart, User, Compass } from "lucide-react";

const NAV_ITEMS = [
  { path: "/feed", icon: Home, label: "Home" },
  { path: "/search", icon: Compass, label: "Discover" },
  { path: "/discover", icon: Search, label: "Search" },
  { path: "/matches", icon: Heart, label: "Activity" },
  { path: "/profile", icon: User, label: "Profile" },
];

export default function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  if (location.pathname.startsWith("/chat/")) return null;

  const { data: unreadCount = 0 } = useQuery({
    queryKey: ["unread-messages-count", user?.id],
    queryFn: async () => {
      if (!user) return 0;
      const { count } = await supabase
        .from("messages")
        .select("*", { count: "exact", head: true })
        .eq("receiver_id", user.id)
        .eq("is_read", false);
      return count || 0;
    },
    enabled: !!user,
    refetchInterval: 10000,
  });

  const { data: notifCount = 0 } = useQuery({
    queryKey: ["unread-notifications-count", user?.id],
    queryFn: async () => {
      if (!user) return 0;
      const { count } = await supabase
        .from("notifications" as any)
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("is_read", false);
      return count || 0;
    },
    enabled: !!user,
    refetchInterval: 15000,
  });

  const getBadge = (path: string) => {
    if (path === "/chats") return unreadCount;
    if (path === "/notifications") return notifCount;
    return 0;
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 safe-bottom">
      <div className="bg-background/85 backdrop-blur-2xl border-t border-border/60">
        <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-1">
          {NAV_ITEMS.map((item) => {
            const active = location.pathname === item.path;
            const badge = getBadge(item.path);
            return (
              <motion.button
                key={item.path}
                onClick={() => navigate(item.path)}
                whileTap={{ scale: 0.85 }}
                className="relative flex flex-col items-center justify-center gap-0.5 w-14 h-12 rounded-xl transition-colors"
              >
                <div className="relative">
                  <motion.div
                    animate={{
                      scale: active ? 1.1 : 1,
                      y: active ? -1 : 0,
                    }}
                    transition={{ type: "spring", stiffness: 400, damping: 20 }}
                  >
                    {item.path === "/profile" && user?.id ? (
                      <div className={`w-6 h-6 rounded-full overflow-hidden border ${active ? "border-foreground" : "border-transparent"}`}>
                        <Avatar className="w-full h-full">
                          <AvatarImage src={(user as any)?.user_metadata?.avatar_url} />
                          <AvatarFallback><User className="w-4 h-4" /></AvatarFallback>
                        </Avatar>
                      </div>
                    ) : (
                      <item.icon
                        className={`w-[24px] h-[24px] transition-colors duration-200 ${
                          active ? "text-foreground" : "text-foreground/70"
                        }`}
                        fill={active && (item.path === "/matches" || item.path === "/feed") ? "currentColor" : "none"}
                        strokeWidth={active ? 2.2 : 1.8}
                      />
                    )}
                  </motion.div>
                  {badge > 0 && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 500, damping: 20 }}
                      className="absolute -top-1.5 -right-2.5 min-w-[16px] h-[16px] px-1 rounded-full gradient-primary text-primary-foreground text-[9px] font-bold flex items-center justify-center shadow-glow"
                    >
                      {badge > 99 ? "99+" : badge}
                    </motion.span>
                  )}
                </div>
                <span className={`text-[10px] font-medium transition-colors duration-200 ${
                  active ? "text-primary" : "text-muted-foreground"
                }`}>
                  {item.label}
                </span>
              </motion.button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
