import { useLocation, useNavigate } from "react-router-dom";
import { Compass, MessageCircle, Heart, User, Search } from "lucide-react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const NAV_ITEMS = [
  { path: "/discover", icon: Compass, label: "Discover", badgeKey: null },
  { path: "/search", icon: Search, label: "Search", badgeKey: null },
  { path: "/matches", icon: Heart, label: "Matches", badgeKey: "matches" },
  { path: "/chats", icon: MessageCircle, label: "Chats", badgeKey: "unread" },
  { path: "/profile", icon: User, label: "Profile", badgeKey: "requests" },
];

export default function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  // Hide on chat conversation page
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

  const { data: requestCount = 0 } = useQuery({
    queryKey: ["pending-requests-count", user?.id],
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
    refetchInterval: 30000,
  });

  const getBadge = (badgeKey: string | null) => {
    if (badgeKey === "unread") return unreadCount;
    if (badgeKey === "requests") return requestCount;
    return 0;
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/90 backdrop-blur-xl border-t border-border">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
        {NAV_ITEMS.map((item) => {
          const active = location.pathname === item.path;
          const badge = getBadge(item.badgeKey);
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className="relative flex flex-col items-center gap-0.5 px-4 py-2"
            >
              {active && (
                <motion.div
                  layoutId="nav-indicator"
                  className="absolute -top-px left-2 right-2 h-0.5 gradient-primary rounded-full"
                />
              )}
              <div className="relative">
                <item.icon
                  className={`w-5 h-5 transition-colors ${
                    active ? "text-primary" : "text-muted-foreground"
                  }`}
                />
                {badge > 0 && (
                  <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 px-1 rounded-full gradient-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
                    {badge > 99 ? "99+" : badge}
                  </span>
                )}
              </div>
              <span
                className={`text-[10px] font-medium transition-colors ${
                  active ? "text-primary" : "text-muted-foreground"
                }`}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
