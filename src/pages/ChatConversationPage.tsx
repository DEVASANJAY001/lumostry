import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Send, MoreVertical, Shield, Flag, ImagePlus, Loader2, Check, CheckCheck, Heart } from "lucide-react";
import ReportUserModal from "@/components/ReportUserModal";
import TypingIndicator from "@/components/TypingIndicator";
import { format } from "date-fns";
import { toast } from "sonner";
import type { Profile } from "@/hooks/useProfile";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type Message = {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  message_type: string;
  is_read: boolean | null;
  created_at: string;
};

const REACTIONS = ["❤️", "😂", "😮", "😢", "🔥", "👍"];

export default function ChatConversationPage() {
  const { userId } = useParams<{ userId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [newMessage, setNewMessage] = useState("");
  const [showReport, setShowReport] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [activeReaction, setActiveReaction] = useState<string | null>(null);
  const [reactions, setReactions] = useState<Record<string, string>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const typingChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const { data: otherProfile } = useQuery({
    queryKey: ["profile", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", userId!)
        .single();
      return data as Profile;
    },
    enabled: !!userId,
  });

  const { data: messages = [] } = useQuery({
    queryKey: ["messages", user?.id, userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("messages")
        .select("*")
        .or(
          `and(sender_id.eq.${user!.id},receiver_id.eq.${userId}),and(sender_id.eq.${userId},receiver_id.eq.${user!.id})`
        )
        .order("created_at", { ascending: true });
      return (data || []) as Message[];
    },
    enabled: !!user && !!userId,
  });

  // Mark messages as read
  useEffect(() => {
    if (user && userId && messages.length > 0) {
      supabase
        .from("messages")
        .update({ is_read: true })
        .eq("sender_id", userId)
        .eq("receiver_id", user.id)
        .eq("is_read", false)
        .then();
    }
  }, [messages, user, userId]);

  // Realtime subscription
  useEffect(() => {
    if (!user || !userId) return;
    const channel = supabase
      .channel(`messages-${user.id}-${userId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, (payload) => {
        if (payload.eventType === "INSERT") {
          const msg = payload.new as Message;
          if (msg.sender_id === userId || msg.receiver_id === userId) {
            queryClient.invalidateQueries({ queryKey: ["messages", user.id, userId] });
          }
        } else if (payload.eventType === "UPDATE") {
          queryClient.invalidateQueries({ queryKey: ["messages", user.id, userId] });
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, userId, queryClient]);

  // Typing indicator
  useEffect(() => {
    if (!user || !userId) return;
    const channelName = [user.id, userId].sort().join("-");
    const channel = supabase.channel(`typing-${channelName}`, {
      config: { presence: { key: user.id } },
    });
    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        const otherState = state[userId];
        if (otherState && Array.isArray(otherState)) {
          setIsTyping((otherState[0] as any)?.typing === true);
        } else {
          setIsTyping(false);
        }
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") await channel.track({ typing: false });
      });
    typingChannelRef.current = channel;
    return () => { supabase.removeChannel(channel); typingChannelRef.current = null; };
  }, [user, userId]);

  const broadcastTyping = useCallback((typing: boolean) => {
    typingChannelRef.current?.track({ typing });
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);
    broadcastTyping(true);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => broadcastTyping(false), 2000);
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const sendMutation = useMutation({
    mutationFn: async (content: string) => {
      const { error } = await supabase.from("messages").insert({
        sender_id: user!.id, receiver_id: userId!, content, message_type: "text",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["messages", user?.id, userId] });
      queryClient.invalidateQueries({ queryKey: ["chats"] });
      broadcastTyping(false);
    },
  });

  const blockMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("blocked_users")
        .insert({ blocker_id: user!.id, blocked_id: userId! });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("User blocked"); navigate("/chats"); },
  });

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    sendMutation.mutate(newMessage.trim());
    setNewMessage("");
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowedTypes.includes(file.type)) { toast.error("Please select a valid image file"); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error("Image must be less than 5MB"); return; }
    setUploadingPhoto(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${user.id}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("chat-photos").upload(path, file);
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from("chat-photos").getPublicUrl(path);
      const { error } = await supabase.from("messages").insert({
        sender_id: user.id, receiver_id: userId!, content: urlData.publicUrl, message_type: "image",
      });
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["messages", user.id, userId] });
      queryClient.invalidateQueries({ queryKey: ["chats"] });
    } catch { toast.error("Failed to send photo"); } finally {
      setUploadingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleReaction = (msgId: string, emoji: string) => {
    setReactions(prev => ({ ...prev, [msgId]: emoji }));
    setActiveReaction(null);
  };

  // Group messages by date
  const groupedMessages = messages.reduce<{ date: string; msgs: Message[] }[]>((acc, msg) => {
    const dateStr = format(new Date(msg.created_at), "MMM d, yyyy");
    const last = acc[acc.length - 1];
    if (last && last.date === dateStr) {
      last.msgs.push(msg);
    } else {
      acc.push({ date: dateStr, msgs: [msg] });
    }
    return acc;
  }, []);

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header - glass effect */}
      <div className="flex items-center gap-3 px-4 py-3 bg-card/80 backdrop-blur-xl border-b border-border">
        <button onClick={() => navigate("/chats")} className="p-1.5 rounded-full hover:bg-secondary transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>

        <button onClick={() => navigate(`/user/${userId}`)} className="flex items-center gap-3 flex-1 text-left">
          <div className="relative">
            <div className="w-10 h-10 rounded-full overflow-hidden bg-secondary ring-2 ring-primary/20">
              {otherProfile?.avatar_url ? (
                <img src={otherProfile.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-lg">
                  {otherProfile?.gender === "female" ? "👩" : "👨"}
                </div>
              )}
            </div>
            {otherProfile?.is_online && (
              <div className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-success border-2 border-card animate-pulse" />
            )}
          </div>
          <div className="flex-1">
            <h2 className="font-heading font-semibold text-sm">{otherProfile?.name || otherProfile?.username || "..."}</h2>
            <p className="text-xs text-muted-foreground">
              {isTyping ? (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-primary font-medium"
                >
                  typing...
                </motion.span>
              ) : otherProfile?.is_online ? "Online" : "Offline"}
            </p>
          </div>
        </button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="p-2 rounded-full hover:bg-secondary transition-colors">
              <MoreVertical className="w-5 h-5 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setShowReport(true)}>
              <Flag className="w-4 h-4 mr-2" /> Report User
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => blockMutation.mutate()} className="text-destructive">
              <Shield className="w-4 h-4 mr-2" /> Block User
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-1">
        {groupedMessages.map((group) => (
          <div key={group.date}>
            {/* Date separator */}
            <div className="flex items-center justify-center my-4">
              <span className="px-3 py-1 rounded-full bg-secondary text-[11px] text-muted-foreground font-medium">
                {group.date}
              </span>
            </div>
            {group.msgs.map((msg, idx) => {
              const isMine = msg.sender_id === user?.id;
              const prevMsg = idx > 0 ? group.msgs[idx - 1] : null;
              const isConsecutive = prevMsg?.sender_id === msg.sender_id;
              const reaction = reactions[msg.id];

              return (
                <div key={msg.id} className={`${isConsecutive ? "mt-0.5" : "mt-3"}`}>
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.2 }}
                    className={`flex ${isMine ? "justify-end" : "justify-start"}`}
                  >
                    <div className="relative group">
                      <div
                        className={`max-w-[75%] px-4 py-2.5 text-sm relative ${
                          isMine
                            ? `gradient-primary text-primary-foreground ${isConsecutive ? "rounded-2xl rounded-tr-lg" : "rounded-2xl rounded-br-lg"}`
                            : `bg-card border border-border text-foreground ${isConsecutive ? "rounded-2xl rounded-tl-lg" : "rounded-2xl rounded-bl-lg"}`
                        }`}
                        onDoubleClick={() => setActiveReaction(activeReaction === msg.id ? null : msg.id)}
                      >
                        {msg.message_type === "image" ? (
                          <img
                            src={msg.content}
                            alt="Photo"
                            className="rounded-xl max-w-full max-h-60 object-cover cursor-pointer"
                            onClick={() => window.open(msg.content, "_blank")}
                          />
                        ) : (
                          <p className="leading-relaxed">{msg.content}</p>
                        )}

                        <div className={`flex items-center gap-1 mt-1 ${isMine ? "justify-end" : ""}`}>
                          <span className={`text-[10px] ${isMine ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                            {format(new Date(msg.created_at), "HH:mm")}
                          </span>
                          {isMine && (
                            msg.is_read ? (
                              <CheckCheck className="w-3.5 h-3.5 text-primary-foreground/80" />
                            ) : (
                              <Check className="w-3.5 h-3.5 text-primary-foreground/40" />
                            )
                          )}
                        </div>
                      </div>

                      {/* Reaction display */}
                      {reaction && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className={`absolute -bottom-2.5 ${isMine ? "left-2" : "right-2"} bg-card border border-border rounded-full px-1.5 py-0.5 text-xs shadow-card`}
                        >
                          {reaction}
                        </motion.div>
                      )}

                      {/* Reaction picker */}
                      <AnimatePresence>
                        {activeReaction === msg.id && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.8, y: 5 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.8, y: 5 }}
                            className={`absolute -top-10 ${isMine ? "right-0" : "left-0"} flex gap-1 bg-card border border-border rounded-full px-2 py-1.5 shadow-elevated z-10`}
                          >
                            {REACTIONS.map((emoji) => (
                              <button
                                key={emoji}
                                onClick={() => handleReaction(msg.id, emoji)}
                                className="text-base hover:scale-125 transition-transform active:scale-90"
                              >
                                {emoji}
                              </button>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </motion.div>
                </div>
              );
            })}
          </div>
        ))}

        {isTyping && (
          <div className="mt-3">
            <TypingIndicator />
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input - polished */}
      <form
        onSubmit={handleSend}
        className="flex items-center gap-2 p-3 bg-card/80 backdrop-blur-xl border-t border-border"
      >
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploadingPhoto}
          className="p-2.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary transition-all"
        >
          {uploadingPhoto ? <Loader2 className="w-5 h-5 animate-spin" /> : <ImagePlus className="w-5 h-5" />}
        </button>
        <Input
          value={newMessage}
          onChange={handleInputChange}
          placeholder="Type a message..."
          className="flex-1 bg-secondary border-0 rounded-full px-4 h-10 focus-visible:ring-1 focus-visible:ring-primary/50"
        />
        <motion.div whileTap={{ scale: 0.85 }}>
          <Button
            type="submit"
            size="icon"
            disabled={!newMessage.trim() || sendMutation.isPending}
            className="rounded-full gradient-primary text-primary-foreground shadow-glow w-10 h-10 flex-shrink-0"
          >
            <Send className="w-4 h-4" />
          </Button>
        </motion.div>
      </form>

      <ReportUserModal
        reportedUserId={userId!}
        reportedUserName={otherProfile?.name || otherProfile?.username || "User"}
        isOpen={showReport}
        onClose={() => setShowReport(false)}
      />
    </div>
  );
}
