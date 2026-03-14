import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Send, MoreVertical, Shield, Flag, ImagePlus, Loader2, Check, CheckCheck, Heart, X } from "lucide-react";
import ReportUserModal from "@/components/ReportUserModal";
import TypingIndicator from "@/components/TypingIndicator";
import { format } from "date-fns";
import { toast } from "sonner";
import type { Profile } from "@/hooks/useProfile";
import Lightbox from "@/components/Lightbox";
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
  const [selectedPhoto, setSelectedPhoto] = useState<File | null>(null);
  const [selectedPhotoPreview, setSelectedPhotoPreview] = useState<string | null>(null);
  const [isOneTimeView, setIsOneTimeView] = useState(false);
  const [viewingOneTimeImage, setViewingOneTimeImage] = useState<string | null>(null);
  const [viewingMsgId, setViewingMsgId] = useState<string | null>(null);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
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

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() && !selectedPhoto) return;

    let photoUrl = null;
    let messageType = "text";

    if (selectedPhoto) {
      setUploadingPhoto(true);
      try {
        const ext = selectedPhoto.name.split(".").pop();
        const path = `${user!.id}/${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage.from("chat-photos").upload(path, selectedPhoto);
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage.from("chat-photos").getPublicUrl(path);
        photoUrl = urlData.publicUrl;
        messageType = isOneTimeView ? "image_once" : "image";
      } catch (err: any) {
        toast.error("Failed to send photo");
        setUploadingPhoto(false);
        return;
      }
    }

    if (photoUrl) {
      const { error } = await supabase.from("messages").insert({
        sender_id: user!.id, receiver_id: userId!, content: photoUrl, message_type: messageType,
      });
      if (error) { toast.error("Error sending image"); setUploadingPhoto(false); return; }
      setSelectedPhoto(null);
      setSelectedPhotoPreview(null);
      setIsOneTimeView(false);
      setUploadingPhoto(false);
    }

    if (newMessage.trim()) {
      sendMutation.mutate(newMessage.trim());
      setNewMessage("");
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowedTypes.includes(file.type)) { toast.error("Please select a valid image file"); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error("Image must be less than 5MB"); return; }

    const reader = new FileReader();
    reader.onloadend = () => {
      setSelectedPhoto(file);
      setSelectedPhotoPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleViewOneTimeImage = (msgId: string, url: string) => {
    setViewingOneTimeImage(url);
    setViewingMsgId(msgId);
  };

  const handleCloseOneTimeImage = async () => {
    if (viewingMsgId) {
      await supabase.from("messages").update({ content: "viewed" }).eq("id", viewingMsgId);
      queryClient.invalidateQueries({ queryKey: ["messages", user?.id, userId] });
    }
    setViewingOneTimeImage(null);
    setViewingMsgId(null);
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
      <div className="flex-1 overflow-y-auto p-4 space-y-1 relative bg-secondary/10">
        {messages.length === 0 && !isTyping && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center text-muted-foreground opacity-70">
            <Heart className="w-12 h-12 mb-3 text-primary/40" />
            <p className="text-sm font-medium">Say hello to {otherProfile?.name || otherProfile?.username || "your match"}!</p>
            <p className="text-xs mt-1">Break the ice and start the conversation.</p>
          </div>
        )}
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
                        className={`max-w-[75%] px-4 py-2.5 text-sm relative shadow-sm ${isMine
                          ? `gradient-primary text-primary-foreground ${isConsecutive ? "rounded-2xl rounded-tr-[4px]" : "rounded-2xl rounded-br-[4px]"}`
                          : `bg-card border border-border text-card-foreground ${isConsecutive ? "rounded-2xl rounded-tl-[4px]" : "rounded-2xl rounded-bl-[4px]"}`
                          }`}
                        onDoubleClick={() => setActiveReaction(activeReaction === msg.id ? null : msg.id)}
                      >
                        {msg.message_type === "image" ? (
                          <img
                            src={msg.content}
                            alt="Photo"
                            className="rounded-xl max-w-full max-h-60 object-cover cursor-pointer hover:opacity-95 transition-opacity"
                            onClick={() => setLightboxImage(msg.content)}
                          />
                        ) : msg.message_type === "image_once" ? (
                          msg.content === "viewed" ? (
                            <div className="flex items-center justify-center p-4 bg-secondary/50 rounded-xl w-40 h-32 border border-border">
                              <p className="text-muted-foreground text-xs font-semibold flex flex-col items-center">
                                <ImagePlus className="w-5 h-5 mb-1 opacity-50" />
                                Viewed
                              </p>
                            </div>
                          ) : (
                            <div
                              className="flex items-center justify-center p-4 bg-primary/10 rounded-xl w-40 h-32 border border-primary/20 cursor-pointer hover:bg-primary/20 transition-colors"
                              onClick={() => handleViewOneTimeImage(msg.id, msg.content)}
                            >
                              <p className="text-primary text-xs font-semibold flex flex-col items-center">
                                <Shield className="w-5 h-5 mb-1" />
                                Tap to view
                              </p>
                            </div>
                          )
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
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-3">
            <TypingIndicator />
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div ref={messagesEndRef} />

      {/* Input - polished */}
      <div className="safe-bottom bg-background">
        <AnimatePresence>
          {selectedPhotoPreview && (
            <motion.div
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
              className="p-3 bg-card border-t border-border flex items-end gap-3"
            >
              <div className="relative">
                <img src={selectedPhotoPreview} alt="Selected" className="h-24 rounded-lg object-cover border border-border" />
                <button type="button" onClick={() => { setSelectedPhoto(null); setSelectedPhotoPreview(null); }} className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-destructive flex items-center justify-center text-white shadow-md hover:scale-110 transition-transform">
                  <X className="w-3 h-3" />
                </button>
              </div>
              <div className="flex-1 flex flex-col gap-2">
                <Button
                  type="button"
                  variant={isOneTimeView ? "default" : "outline"}
                  size="sm"
                  className={`rounded-full self-start text-xs h-8 ${isOneTimeView ? "gradient-primary text-primary-foreground border-0" : ""}`}
                  onClick={() => setIsOneTimeView(!isOneTimeView)}
                >
                  <Shield className="w-3.5 h-3.5 mr-1" />
                  1-Time View
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <form
          onSubmit={handleSend}
          className="flex items-center gap-2 p-3 bg-card/90 backdrop-blur-xl border-t border-border"
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
              disabled={(!newMessage.trim() && !selectedPhoto) || sendMutation.isPending || uploadingPhoto}
              className="rounded-full gradient-primary text-primary-foreground shadow-glow w-10 h-10 flex-shrink-0"
            >
              <Send className="w-4 h-4 ml-0.5" />
            </Button>
          </motion.div>
        </form>
      </div>

      <ReportUserModal
        reportedUserId={userId!}
        reportedUserName={otherProfile?.name || otherProfile?.username || "User"}
        isOpen={showReport}
        onClose={() => setShowReport(false)}
      />

      <AnimatePresence>
        {viewingOneTimeImage && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <button
              className="absolute top-6 right-6 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors"
              onClick={handleCloseOneTimeImage}
            >
              <X className="w-5 h-5" />
            </button>
            <img src={viewingOneTimeImage} alt="1-Time View" className="max-w-full max-h-full rounded-2xl object-scale-down" />
            <p className="absolute bottom-10 text-white/70 text-sm font-medium">This photo will disappear after you close it.</p>
          </motion.div>
        )}
      </AnimatePresence>

      {lightboxImage && (
        <Lightbox src={lightboxImage} onClose={() => setLightboxImage(null)} />
      )}
    </div>
  );
}
