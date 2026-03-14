import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import BottomNav from "@/components/BottomNav";
import PageTransition from "@/components/PageTransition";
import { motion } from "framer-motion";
import { MessageCircle, ArrowLeft } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { Profile } from "@/hooks/useProfile";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

interface ChatPreview {
  profile: Profile;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
}

const listItem = {
  hidden: { opacity: 0, y: 6 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.04, duration: 0.3, ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number] },
  }),
};

export default function ChatsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [watchedStories, setWatchedStories] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem("watched_stories");
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const markStoryAsWatched = (userId: string) => {
    setWatchedStories((prev) => {
      if (prev.includes(userId)) return prev;
      const updated = [...prev, userId];
      localStorage.setItem("watched_stories", JSON.stringify(updated));
      return updated;
    });
  };

  const handleOpenChat = (userId: string) => {
    markStoryAsWatched(userId);
    navigate(`/chat/${userId}`);
  };

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
      <div className="sticky top-0 z-40 bg-background/85 backdrop-blur-2xl border-b border-border/60 px-5 py-3.5 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center transition-all active:scale-90 flex-shrink-0">
          <ArrowLeft className="w-4 h-4 text-foreground" />
        </button>
        <h1 className="text-lg font-heading font-semibold">Messages</h1>
      </div>

      {isLoading ? (
        <div className="space-y-2 p-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-3 p-3">
              <div className="w-12 h-12 rounded-full bg-secondary animate-pulse" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-24 rounded bg-secondary animate-pulse" />
                <div className="h-2.5 w-40 rounded bg-secondary animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      ) : chatPreviews.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="text-center py-24 px-8"
        >
          <div className="w-18 h-18 rounded-full bg-secondary flex items-center justify-center mx-auto mb-4 w-16 h-16">
            <MessageCircle className="w-7 h-7 text-muted-foreground" />
          </div>
          <h3 className="text-base font-heading font-semibold">No messages yet</h3>
          <p className="text-muted-foreground text-sm mt-1.5">Match with someone to start chatting</p>
        </motion.div>
      ) : (
        <div className="py-2">
          {/* Stories Row */}
          <div className="mb-4">
            <ScrollArea className="w-full whitespace-nowrap px-5">
              <div className="flex w-max space-x-4 pb-4 pt-2">
                {chatPreviews.map((chat, i) => {
                  const isWatched = watchedStories.includes(chat.profile.user_id);
                  return (
                    <motion.div
                      key={`story-${chat.profile.user_id}`}
                      custom={i}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.05, type: "spring", stiffness: 300, damping: 20 }}
                      className="flex flex-col items-center gap-1.5 cursor-pointer group"
                      onClick={() => handleOpenChat(chat.profile.user_id)}
                    >
                      <div className={`p-[2.5px] rounded-full transition-colors duration-300 ${isWatched ? "bg-border" : "bg-gradient-to-tr from-amber-400 via-rose-500 to-fuchsia-600"}`}>
                        <div className="w-16 h-16 rounded-full overflow-hidden bg-background border-2 border-background p-0.5">
                          {chat.profile.avatar_url ? (
                            <img src={chat.profile.avatar_url} alt="" className="w-full h-full object-cover rounded-full group-hover:scale-105 transition-transform duration-300" />
                          ) : (
                            <div className="w-full h-full rounded-full bg-secondary flex items-center justify-center text-xl">
                              {chat.profile.gender === "female" ? "👩" : "👨"}
                            </div>
                          )}
                        </div>
                      </div>
                      <span className="text-[11px] font-medium text-muted-foreground max-w-[70px] truncate">
                        {chat.profile.name || chat.profile.username}
                      </span>
                    </motion.div>
                  );
                })}
              </div>
              <ScrollBar orientation="horizontal" className="hidden" />
            </ScrollArea>
          </div>

          <div className="px-5 mb-2">
            <h2 className="text-sm font-semibold text-foreground/80 font-heading">Messages</h2>
          </div>

          {chatPreviews.map((chat, i) => (
            <motion.button
              key={chat.profile.id}
              custom={i}
              variants={listItem}
              initial="hidden"
              animate="visible"
              whileTap={{ scale: 0.98, backgroundColor: "hsl(var(--secondary) / 0.5)" }}
              onClick={() => handleOpenChat(chat.profile.user_id)}
              className="w-full flex items-center gap-3 px-5 py-3.5 text-left transition-colors hover:bg-secondary/30"
            >
              <div className="relative flex-shrink-0">
                <div className="w-13 h-13 rounded-full overflow-hidden bg-secondary w-[52px] h-[52px]">
                  {chat.profile.avatar_url ? (
                    <img src={chat.profile.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xl">
                      {chat.profile.gender === "female" ? "👩" : "👨"}
                    </div>
                  )}
                </div>
                {chat.profile.is_online && (
                  <div className="absolute bottom-0.5 right-0.5 w-3 h-3 rounded-full bg-success border-2 border-background" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h3 className={`text-sm truncate ${chat.unreadCount > 0 ? "font-semibold" : "font-medium"}`}>
                    {chat.profile.name || chat.profile.username}
                  </h3>
                  <span className={`text-[11px] flex-shrink-0 ml-2 ${chat.unreadCount > 0 ? "text-primary font-medium" : "text-muted-foreground"}`}>
                    {formatDistanceToNow(new Date(chat.lastMessageTime), { addSuffix: false })}
                  </span>
                </div>
                <div className="flex items-center justify-between mt-0.5">
                  <p className={`text-xs truncate pr-2 ${chat.unreadCount > 0 ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                    {chat.lastMessage}
                  </p>
                  {chat.unreadCount > 0 && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 400, damping: 15 }}
                      className="min-w-[20px] h-[20px] px-1 rounded-full gradient-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center flex-shrink-0 shadow-glow"
                    >
                      {chat.unreadCount}
                    </motion.span>
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
