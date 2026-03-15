import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Send, MoreVertical, Shield, Flag, ImagePlus, Loader2, Check, CheckCheck, Heart, X, Phone, Video, Info, Mic, Camera, Smile, PlusCircle, Film, MessageCircle } from "lucide-react";
import ReportUserModal from "@/components/ReportUserModal";
import TypingIndicator from "@/components/TypingIndicator";
import { format, formatDistanceToNow } from "date-fns";
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
  shared_post_id?: string;
};

const REACTIONS = ["❤️", "😂", "😮", "😢", "🔥", "👍"];

const SharedPostPreview = ({ postId }: { postId: string }) => {
  const navigate = useNavigate();
  const { data: post, isLoading } = useQuery({
    queryKey: ["shared-post", postId],
    queryFn: async () => {
      const { data, error } = await (supabase
        .from("posts")
        .select(`
          *,
          profiles (username, avatar_url)
        `)
        .eq("id", postId)
        .single() as any);
      if (error) throw error;
      return data;
    },
    enabled: !!postId,
  });

  if (isLoading) {
    return (
      <div className="w-48 aspect-[3/4] bg-secondary/50 rounded-2xl flex items-center justify-center animate-pulse border border-white/10">
        <Loader2 className="w-5 h-5 animate-spin opacity-20" />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="w-48 p-3 bg-secondary/20 rounded-2xl border border-white/5 text-center">
        <p className="text-[10px] text-muted-foreground italic">Post unavailable</p>
      </div>
    );
  }

  return (
    <div
      onClick={() => navigate(`/user/${post.user_id}/posts?postId=${post.id}`)}
      className="w-52 bg-secondary/30 rounded-2xl overflow-hidden border border-white/10 cursor-pointer active:scale-[0.98] transition-all hover:bg-secondary/40 shadow-xl group mt-1"
    >
      {/* Mini Header */}
      <div className="px-2.5 py-2 flex items-center gap-2 bg-white/5">
        <div className="w-5 h-5 rounded-full overflow-hidden border border-white/10">
          <img src={post.profiles?.avatar_url || ""} alt="" className="w-full h-full object-cover" />
        </div>
        <span className="text-[11px] font-bold truncate opacity-90">{post.profiles?.username}</span>
      </div>

      {/* Media Preview */}
      <div className="aspect-square relative bg-black/10">
        {post.media_type === "video" || post.media_type === "reel" ? (
          <video src={post.media_url} className="w-full h-full object-cover" />
        ) : (
          <img src={post.media_url} alt="" className="w-full h-full object-cover" />
        )}
        {(post.media_type === "reel" || post.media_type === "video") && (
          <div className="absolute top-2 right-2 p-1 rounded-md bg-black/40 backdrop-blur-md">
            <Film className="w-3 h-3 text-white" />
          </div>
        )}
      </div>

      {/* Caption/Link */}
      <div className="p-2.5">
        {post.caption && (
          <p className="text-[11px] line-clamp-2 opacity-80 mb-2 leading-tight">{post.caption}</p>
        )}
        <div className="text-[10px] font-bold text-primary flex items-center gap-1 group-hover:gap-2 transition-all">
          View Post <ArrowLeft className="w-3 h-3 rotate-180" />
        </div>
      </div>
    </div>
  );
};

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
        .maybeSingle();
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

  if (otherProfile === undefined) {
    return (
      <div className="h-screen flex flex-col items-center justify-center p-10 text-center bg-background">
        <Loader2 className="w-10 h-10 animate-spin text-primary opacity-50 mb-4" />
        <p className="text-muted-foreground animate-pulse">Loading conversation...</p>
      </div>
    );
  }

  if (!otherProfile) {
    return (
      <div className="h-screen flex flex-col items-center justify-center p-10 text-center bg-background">
        <div className="w-20 h-20 rounded-full bg-secondary flex items-center justify-center mb-6">
          <MessageCircle className="w-10 h-10 text-muted-foreground opacity-20" />
        </div>
        <h3 className="text-xl font-bold mb-2">User not found</h3>
        <p className="text-muted-foreground mb-8">This user may have deleted their account or the chat is invalid.</p>
        <Button onClick={() => navigate("/chats")} variant="secondary" className="rounded-full px-8">
          Back to Chats
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header - Instagram Style */}
      <div className="flex items-center gap-3 px-4 py-2 bg-background/80 backdrop-blur-xl border-b border-border/40 sticky top-0 z-[100]">
        <button onClick={() => navigate("/chats")} className="p-1 -ml-1 hover:bg-secondary rounded-full transition-colors active:scale-90">
          <ArrowLeft className="w-6 h-6" />
        </button>

        <button onClick={() => navigate(`/user/${userId}`)} className="flex items-center gap-3 flex-1 text-left min-w-0">
          <div className="w-8 h-8 rounded-full overflow-hidden bg-secondary border border-border/40 flex-shrink-0">
            {otherProfile?.avatar_url ? (
              <img src={otherProfile.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-sm">
                {otherProfile?.gender === "female" ? "👩" : "👨"}
              </div>
            )}
          </div>
          <div className="flex flex-col min-w-0">
            <h2 className="font-bold text-[14px] truncate leading-tight">{otherProfile?.name || otherProfile?.username || "..."}</h2>
            <div className="flex items-center gap-1">
              {isTyping ? (
                <span className="text-[11px] text-primary font-medium">typing...</span>
              ) : (
                <>
                  <div className={`w-1.5 h-1.5 rounded-full ${otherProfile?.is_online ? "bg-green-500" : "bg-neutral-500"}`} />
                  <span className="text-[11px] text-muted-foreground">
                    {otherProfile?.is_online ? "Active now" : "Offline"}
                  </span>
                </>
              )}
            </div>
          </div>
        </button>

        <div className="flex items-center gap-4 text-foreground/90">
          <button className="p-1 hover:bg-secondary rounded-full transition-colors active:scale-90">
            <Phone className="w-[20px] h-[20px]" />
          </button>
          <button className="p-1 hover:bg-secondary rounded-full transition-colors active:scale-90">
            <Video className="w-[22px] h-[22px]" />
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-1 hover:bg-secondary rounded-full transition-colors active:scale-90">
                <Info className="w-[22px] h-[22px]" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 rounded-xl">
              <DropdownMenuItem onClick={() => setShowReport(true)} className="py-2.5">
                <Flag className="w-4 h-4 mr-2" /> Report User
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => blockMutation.mutate()} className="text-destructive py-2.5">
                <Shield className="w-4 h-4 mr-2" /> Block User
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
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
              const nextMsg = idx < group.msgs.length - 1 ? group.msgs[idx + 1] : null;

              const isFirstInSequence = prevMsg?.sender_id !== msg.sender_id;
              const isLastInSequence = nextMsg?.sender_id !== msg.sender_id;
              const reaction = reactions[msg.id];

              return (
                <div key={msg.id} className={`${!isFirstInSequence ? "mt-0.5" : "mt-4"} flex flex-col`}>
                  {!isMine && isFirstInSequence && (
                    <div className="text-[11px] text-muted-foreground font-medium ml-10 mb-1">
                      {otherProfile?.name || otherProfile?.username}
                    </div>
                  )}

                  <div className={`flex items-end gap-2 ${isMine ? "flex-row-reverse" : "flex-row"}`}>
                    {!isMine && (
                      <div className="w-8 flex-shrink-0">
                        {isLastInSequence ? (
                          <div className="w-8 h-8 rounded-full overflow-hidden border border-border/20">
                            {otherProfile?.avatar_url ? (
                              <img src={otherProfile.avatar_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full bg-secondary flex items-center justify-center text-[10px]">
                                {otherProfile?.name?.charAt(0)}
                              </div>
                            )}
                          </div>
                        ) : <div className="w-8" />}
                      </div>
                    )}

                    <div className={`relative group max-w-[75%] ${isMine ? "items-end" : "items-start"}`}>
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className={`px-4 py-2 text-[14px] leading-[1.4] transition-all
                          ${isMine
                            ? "bg-gradient-to-br from-fuchsia-600 to-purple-600 text-white"
                            : "bg-[#262626] text-white"
                          }
                          ${isMine
                            ? (isFirstInSequence && isLastInSequence ? "rounded-[22px]" :
                              isFirstInSequence ? "rounded-t-[22px] rounded-bl-[22px] rounded-br-[4px]" :
                                isLastInSequence ? "rounded-b-[22px] rounded-tl-[22px] rounded-tr-[4px]" :
                                  "rounded-l-[22px] rounded-r-[4px]")
                            : (isFirstInSequence && isLastInSequence ? "rounded-[22px]" :
                              isFirstInSequence ? "rounded-t-[22px] rounded-br-[22px] rounded-bl-[4px]" :
                                isLastInSequence ? "rounded-b-[22px] rounded-tr-[22px] rounded-tl-[4px]" :
                                  "rounded-r-[22px] rounded-l-[4px]")
                          }
                        `}
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
                            <div className="flex items-center justify-center p-4 bg-[#333] rounded-xl w-40 h-32 border border-border/20">
                              <p className="text-muted-foreground text-[11px] font-semibold flex flex-col items-center">
                                <ImagePlus className="w-5 h-5 mb-1 opacity-50" />
                                Viewed
                              </p>
                            </div>
                          ) : (
                            <div
                              className="flex items-center justify-center p-4 bg-primary/10 rounded-xl w-40 h-32 border border-primary/20 cursor-pointer hover:bg-primary/20 transition-colors"
                              onClick={() => handleViewOneTimeImage(msg.id, msg.content)}
                            >
                              <p className="text-primary text-[11px] font-semibold flex flex-col items-center">
                                <Shield className="w-5 h-5 mb-1" />
                                Tap to view
                              </p>
                            </div>
                          )
                        ) : msg.message_type === "post_share" ? (
                          <SharedPostPreview postId={msg.shared_post_id!} />
                        ) : (
                          <p>{msg.content}</p>
                        )}

                        {reaction && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className={`absolute -bottom-2 ${isMine ? "right-1" : "left-1"} bg-[#262626] border border-white/10 rounded-full px-1 py-0.5 text-[10px] shadow-lg`}
                          >
                            {reaction}
                          </motion.div>
                        )}
                      </motion.div>

                      <AnimatePresence>
                        {activeReaction === msg.id && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.8, y: 5 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.8, y: 5 }}
                            className={`absolute -top-10 ${isMine ? "right-0" : "left-0"} flex gap-1 bg-[#262626] border border-white/10 rounded-full px-2 py-1 shadow-xl z-10`}
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
                  </div>
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

      {/* Input - Polished Instagram Style */}
      <div className="bg-background px-3 py-2 border-t border-border/20">
        <AnimatePresence>
          {selectedPhotoPreview && (
            <motion.div
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
              className="mb-2 p-2 bg-secondary/30 rounded-2xl flex items-end gap-3"
            >
              <div className="relative">
                <img src={selectedPhotoPreview} alt="Selected" className="h-20 rounded-xl object-cover border border-border/20" />
                <button type="button" onClick={() => { setSelectedPhoto(null); setSelectedPhotoPreview(null); }} className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-destructive flex items-center justify-center text-white shadow-md">
                  <X className="w-3 h-3" />
                </button>
              </div>
              <Button
                type="button"
                variant={isOneTimeView ? "default" : "outline"}
                size="sm"
                className={`rounded-full text-[10px] h-7 ${isOneTimeView ? "bg-primary text-white" : ""}`}
                onClick={() => setIsOneTimeView(!isOneTimeView)}
              >
                <Shield className="w-3 h-3 mr-1" />
                1-Time View
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        <form onSubmit={handleSend} className="flex items-center gap-2">
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-1.5 rounded-full bg-blue-500 text-white active:scale-90 transition-transform"
            >
              <Camera className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 relative flex items-center">
            <Input
              value={newMessage}
              onChange={handleInputChange}
              placeholder="Message..."
              className="w-full bg-secondary border-0 rounded-full pl-4 pr-24 h-11 text-[14px] focus-visible:ring-0"
            />
            <div className="absolute right-2 flex items-center gap-3 text-foreground/80">
              {newMessage.trim() ? (
                <button
                  type="submit"
                  className="text-primary font-bold text-[14px] pr-2 hover:opacity-80 active:scale-95 transition-all"
                >
                  Send
                </button>
              ) : (
                <>
                  <button type="button" className="hover:opacity-70 active:scale-95 transition-all"><Mic className="w-5 h-5" /></button>
                  <button type="button" className="hover:opacity-70 active:scale-95 transition-all" onClick={() => fileInputRef.current?.click()}><ImagePlus className="w-5 h-5" /></button>
                  <button type="button" className="hover:opacity-70 active:scale-95 transition-all"><Smile className="w-5 h-5" /></button>
                  <button type="button" className="hover:opacity-70 active:scale-95 transition-all pr-1"><PlusCircle className="w-5 h-5" /></button>
                </>
              )}
            </div>
          </div>
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
