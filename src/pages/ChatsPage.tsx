import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import BottomNav from "@/components/BottomNav";
import PageTransition from "@/components/PageTransition";
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
      const { data: matches } = await supabase.from("matches").select("*").or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`);
      if (!matches || matches.length === 0) return [];
      const otherIds = matches.map((m) => m.user1_id === user.id ? m.user2_id : m.user1_id);
      const { data: profiles } = await supabase.from("profiles").select("*").in("user_id", otherIds);
      if (!profiles) return [];

      const previews: ChatPreview[] = [];
      for (const profile of profiles) {
        const { data: msgs } = await supabase.from("messages").select("*")
          .or(`and(sender_id.eq.${user.id},receiver_id.eq.${profile.user_id}),and(sender_id.eq.${profile.user_id},receiver_id.eq.${user.id})`)
          .order("created_at", { ascending: false }).limit(1);
        const { count } = await supabase.from("messages").select("*", { count: "exact", head: true })
          .eq("sender_id", profile.user_id).eq("receiver_id", user.id).eq("is_read", false);
        const lastMsg = msgs?.[0];
        previews.push({
          profile: profile as Profile,
          lastMessage: lastMsg ? (lastMsg.message_type === "image" ? "📷 Photo" : lastMsg.content) : "Say hello! 👋",
          lastMessageTime: lastMsg?.created_at || profile.created_at,
          unreadCount: count || 0,
        });
      }
      previews.sort((a, b) => new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime());
      return previews;
    },
    enabled: !!user,
  });

  return (
    <PageTransition className="min-h-screen pb-20">
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border px-5 py-3">
        <h1 className="text-lg font-heading font-semibold">Messages</h1>
      </div>

      {isLoading ? (
        <div className="text-center py-20">
          <MessageCircle className="w-7 h-7 text-primary animate-pulse mx-auto" />
        </div>
      ) : chatPreviews.length === 0 ? (
        <div className="text-center py-20 px-8">
          <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mx-auto mb-4">
            <MessageCircle className="w-7 h-7 text-muted-foreground" />
          </div>
          <h3 className="text-base font-heading font-semibold">No messages yet</h3>
          <p className="text-muted-foreground text-sm mt-1">Match with someone to start chatting</p>
        </div>
      ) : (
        <div>
          {chatPreviews.map((chat, i) => (
            <motion.button
              key={chat.profile.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.02 }}
              onClick={() => navigate(`/chat/${chat.profile.user_id}`)}
              className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-secondary/30 transition-colors text-left active:bg-secondary/50"
            >
              <div className="relative">
                <div className="w-12 h-12 rounded-full overflow-hidden bg-secondary flex-shrink-0">
                  {chat.profile.avatar_url ? (
                    <img src={chat.profile.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xl">
                      {chat.profile.gender === "female" ? "👩" : "👨"}
                    </div>
                  )}
                </div>
                {chat.profile.is_online && (
                  <div className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-success border-2 border-background" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-sm truncate">{chat.profile.name || chat.profile.username}</h3>
                  <span className="text-[11px] text-muted-foreground flex-shrink-0">
                    {formatDistanceToNow(new Date(chat.lastMessageTime), { addSuffix: false })}
                  </span>
                </div>
                <div className="flex items-center justify-between mt-0.5">
                  <p className="text-xs text-muted-foreground truncate pr-2">{chat.lastMessage}</p>
                  {chat.unreadCount > 0 && (
                    <span className="w-5 h-5 rounded-full gradient-primary text-primary-foreground text-[10px] font-semibold flex items-center justify-center flex-shrink-0">
                      {chat.unreadCount}
                    </span>
                  )}
                </div>
              </div>
            </motion.button>
          ))}
        </div>
      )}

      <BottomNav />
    </PageTransition>
  );
}
