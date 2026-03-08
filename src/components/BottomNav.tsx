import { useLocation, useNavigate } from "react-router-dom";
import { Compass, MessageCircle, Heart, User, Search } from "lucide-react";
import { motion } from "framer-motion";

const NAV_ITEMS = [
  { path: "/discover", icon: Compass, label: "Discover" },
  { path: "/search", icon: Search, label: "Search" },
  { path: "/matches", icon: Heart, label: "Matches" },
  { path: "/chats", icon: MessageCircle, label: "Chats" },
  { path: "/profile", icon: User, label: "Profile" },
];

export default function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();

  // Hide on chat conversation page
  if (location.pathname.startsWith("/chat/")) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/90 backdrop-blur-xl border-t border-border">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
        {NAV_ITEMS.map((item) => {
          const active = location.pathname === item.path;
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
              <item.icon
                className={`w-5 h-5 transition-colors ${
                  active ? "text-primary" : "text-muted-foreground"
                }`}
              />
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
