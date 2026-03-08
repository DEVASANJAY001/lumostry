import { useLocation, useNavigate } from "react-router-dom";
import { Flame, MessageCircle, Heart, User, Search, Bell } from "lucide-react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const NAV_ITEMS = [
  { path: "/discover", icon: Flame, label: "Discover" },
  { path: "/search", icon: Search, label: "Explore" },
  { path: "/matches", icon: Heart, label: "Matches" },
  { path: "/chats", icon: MessageCircle, label: "Chat" },
  { path: "/notifications", icon: Bell, label: "Alerts" },
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
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-t border-border safe-bottom">
      <div className="flex items-center justify-around h-14 max-w-lg mx-auto">
        {NAV_ITEMS.map((item) => {
          const active = location.pathname === item.path;
          const badge = getBadge(item.path);
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className="relative flex flex-col items-center gap-0.5 px-3 py-1.5 transition-all active:scale-90"
            >
              <div className="relative">
                <item.icon
                  className={`w-[22px] h-[22px] transition-all ${
                    active
                      ? item.path === "/discover"
                        ? "text-primary"
                        : "text-foreground"
                      : "text-muted-foreground"
                  }`}
                  fill={active && (item.path === "/matches" || item.path === "/discover") ? "currentColor" : "none"}
                  strokeWidth={active ? 2.5 : 1.8}
                />
                {badge > 0 && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-1.5 -right-2.5 min-w-[16px] h-[16px] px-1 rounded-full gradient-primary text-primary-foreground text-[9px] font-bold flex items-center justify-center shadow-glow"
                  >
                    {badge > 99 ? "99+" : badge}
                  </motion.span>
                )}
              </div>
              {active && (
                <motion.div
                  layoutId="nav-indicator"
                  className="w-1 h-1 rounded-full bg-primary mt-0.5"
                  transition={{ type: "spring", stiffness: 300, damping: 25 }}
                />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
