import { useLocation, useNavigate } from "react-router-dom";
import { Flame, MessageCircle, Heart, User, Search } from "lucide-react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const NAV_ITEMS = [
  { path: "/discover", icon: Flame, label: "Discover" },
  { path: "/search", icon: Search, label: "Explore" },
  { path: "/matches", icon: Heart, label: "Matches" },
  { path: "/chats", icon: MessageCircle, label: "Chat" },
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

  const getBadge = (path: string) => {
    if (path === "/chats") return unreadCount;
    if (path === "/profile") return requestCount;
    return 0;
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border safe-bottom">
      <div className="flex items-center justify-around h-14 max-w-lg mx-auto">
        {NAV_ITEMS.map((item) => {
          const active = location.pathname === item.path;
          const badge = getBadge(item.path);
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className="relative flex flex-col items-center gap-0.5 px-5 py-1.5 transition-colors"
            >
              <div className="relative">
                <item.icon
                  className={`w-6 h-6 transition-all ${
                    active
                      ? item.path === "/discover"
                        ? "text-primary"
                        : "text-foreground"
                      : "text-muted-foreground"
                  }`}
                  fill={active && item.path === "/matches" ? "currentColor" : "none"}
                  strokeWidth={active ? 2.5 : 2}
                />
                {badge > 0 && (
                  <span className="absolute -top-1 -right-2.5 min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
                    {badge > 99 ? "99+" : badge}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
