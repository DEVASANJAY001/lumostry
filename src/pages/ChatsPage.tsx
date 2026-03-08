import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import BottomNav from "@/components/BottomNav";
import { motion } from "framer-motion";
import { MessageCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { Profile } from "@/hooks/useProfile";

interface ChatPreview {
  profile: Profile;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
}

export default function ChatsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: chatPreviews = [], isLoading } = useQuery({
    queryKey: ["chats", user?.id],
    queryFn: async () => {
      if (!user) return [];

      // Get all matches
      const { data: matches } = await supabase
        .from("matches")
        .select("*")
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`);

      if (!matches || matches.length === 0) return [];

      const otherIds = matches.map((m) =>
        m.user1_id === user.id ? m.user2_id : m.user1_id
      );

      // Get profiles
      const { data: profiles } = await supabase
        .from("profiles")
        .select("*")
        .in("user_id", otherIds);

      if (!profiles) return [];

      // Get last messages for each conversation
      const previews: ChatPreview[] = [];
      for (const profile of profiles) {
        const { data: msgs } = await supabase
          .from("messages")
          .select("*")
          .or(
            `and(sender_id.eq.${user.id},receiver_id.eq.${profile.user_id}),and(sender_id.eq.${profile.user_id},receiver_id.eq.${user.id})`
          )
          .order("created_at", { ascending: false })
          .limit(1);

        const { count } = await supabase
          .from("messages")
          .select("*", { count: "exact", head: true })
          .eq("sender_id", profile.user_id)
          .eq("receiver_id", user.id)
          .eq("is_read", false);

        previews.push({
          profile: profile as Profile,
          lastMessage: msgs?.[0]?.content || "Say hello! 👋",
          lastMessageTime: msgs?.[0]?.created_at || profile.created_at,
          unreadCount: count || 0,
        });
      }

      previews.sort(
        (a, b) => new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime()
      );

      return previews;
    },
    enabled: !!user,
  });

  return (
    <div className="min-h-screen pb-20">
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border px-4 py-3">
        <h1 className="text-xl font-heading font-bold text-gradient">Chats</h1>
      </div>

      <div className="divide-y divide-border">
        {isLoading ? (
          <div className="text-center py-16">
            <MessageCircle className="w-8 h-8 text-primary animate-pulse mx-auto" />
          </div>
        ) : chatPreviews.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-4">💬</div>
            <h3 className="text-lg font-heading font-semibold">No chats yet</h3>
            <p className="text-muted-foreground text-sm mt-1">Match with someone to start chatting!</p>
          </div>
        ) : (
          chatPreviews.map((chat, i) => (
            <motion.button
              key={chat.profile.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              onClick={() => navigate(`/chat/${chat.profile.user_id}`)}
              className="w-full flex items-center gap-3 p-4 hover:bg-secondary/50 transition-colors text-left"
            >
              <div className="relative">
                <div className="w-14 h-14 rounded-full overflow-hidden bg-secondary flex-shrink-0">
                  {chat.profile.avatar_url ? (
                    <img src={chat.profile.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-2xl">
                      {chat.profile.gender === "female" ? "👩" : "👨"}
                    </div>
                  )}
                </div>
                {chat.profile.is_online && (
                  <div className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-success border-2 border-background" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-sm truncate">
                    {chat.profile.name || chat.profile.username}
                  </h3>
                  <span className="text-xs text-muted-foreground flex-shrink-0">
                    {formatDistanceToNow(new Date(chat.lastMessageTime), { addSuffix: false })}
                  </span>
                </div>
                <div className="flex items-center justify-between mt-0.5">
                  <p className="text-sm text-muted-foreground truncate">{chat.lastMessage}</p>
                  {chat.unreadCount > 0 && (
                    <span className="w-5 h-5 rounded-full gradient-primary text-primary-foreground text-xs font-bold flex items-center justify-center flex-shrink-0 ml-2">
                      {chat.unreadCount}
                    </span>
                  )}
                </div>
              </div>
            </motion.button>
          ))
        )}
      </div>

      <BottomNav />
    </div>
  );
}
