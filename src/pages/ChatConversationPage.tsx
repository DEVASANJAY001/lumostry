import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";
import { ArrowLeft, Send, MoreVertical, Shield, Flag, ImagePlus, Loader2, Check, CheckCheck } from "lucide-react";
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

export default function ChatConversationPage() {
  const { userId } = useParams<{ userId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [newMessage, setNewMessage] = useState("");
  const [showReport, setShowReport] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
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

  // Realtime subscription for messages
  useEffect(() => {
    if (!user || !userId) return;

    const channel = supabase
      .channel(`messages-${user.id}-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "messages",
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const msg = payload.new as Message;
            if (msg.sender_id === userId || msg.receiver_id === userId) {
              queryClient.invalidateQueries({ queryKey: ["messages", user.id, userId] });
            }
          } else if (payload.eventType === "UPDATE") {
            // Read receipt update
            queryClient.invalidateQueries({ queryKey: ["messages", user.id, userId] });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, userId, queryClient]);

  // Typing indicator via presence channel
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
          const typing = (otherState[0] as any)?.typing === true;
          setIsTyping(typing);
        } else {
          setIsTyping(false);
        }
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({ typing: false });
        }
      });

    typingChannelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      typingChannelRef.current = null;
    };
  }, [user, userId]);

  const broadcastTyping = useCallback((typing: boolean) => {
    typingChannelRef.current?.track({ typing });
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);
    broadcastTyping(true);

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      broadcastTyping(false);
    }, 2000);
  };

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const sendMutation = useMutation({
    mutationFn: async (content: string) => {
      const { error } = await supabase.from("messages").insert({
        sender_id: user!.id,
        receiver_id: userId!,
        content,
        message_type: "text",
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
    onSuccess: () => {
      toast.success("User blocked");
      navigate("/chats");
    },
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
    if (!allowedTypes.includes(file.type)) {
      toast.error("Please select a valid image file");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be less than 5MB");
      return;
    }

    setUploadingPhoto(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${user.id}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("chat-photos")
        .upload(path, file);
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("chat-photos")
        .getPublicUrl(path);

      const { error } = await supabase.from("messages").insert({
        sender_id: user.id,
        receiver_id: userId!,
        content: urlData.publicUrl,
        message_type: "image",
      });
      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ["messages", user.id, userId] });
      queryClient.invalidateQueries({ queryKey: ["chats"] });
    } catch (err) {
      toast.error("Failed to send photo");
    } finally {
      setUploadingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-card/90 backdrop-blur-xl border-b border-border">
        <button onClick={() => navigate("/chats")} className="p-1">
          <ArrowLeft className="w-5 h-5" />
        </button>

        <button onClick={() => navigate(`/user/${userId}`)} className="flex items-center gap-3 flex-1 text-left">
          <div className="relative">
            <div className="w-10 h-10 rounded-full overflow-hidden bg-secondary">
              {otherProfile?.avatar_url ? (
                <img src={otherProfile.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-lg">
                  {otherProfile?.gender === "female" ? "👩" : "👨"}
                </div>
              )}
            </div>
            {otherProfile?.is_online && (
              <div className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-green-500 border-2 border-card" />
            )}
          </div>

          <div className="flex-1">
            <h2 className="font-heading font-semibold text-sm">
              {otherProfile?.name || otherProfile?.username || "..."}
            </h2>
            <p className="text-xs text-muted-foreground">
              {isTyping ? (
                <span className="text-primary font-medium">typing...</span>
              ) : otherProfile?.is_online ? (
                "Online"
              ) : (
                "Offline"
              )}
            </p>
          </div>
        </button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="p-2">
              <MoreVertical className="w-5 h-5 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setShowReport(true)}>
              <Flag className="w-4 h-4 mr-2" /> Report User
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => blockMutation.mutate()}
              className="text-destructive"
            >
              <Shield className="w-4 h-4 mr-2" /> Block User
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {messages.map((msg) => {
          const isMine = msg.sender_id === user?.id;
          return (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${isMine ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm ${
                  isMine
                    ? "gradient-primary text-primary-foreground rounded-br-md"
                    : "bg-secondary text-foreground rounded-bl-md"
                }`}
              >
                {msg.message_type === "image" ? (
                  <img
                    src={msg.content}
                    alt="Photo"
                    className="rounded-xl max-w-full max-h-60 object-cover cursor-pointer"
                    onClick={() => window.open(msg.content, "_blank")}
                  />
                ) : (
                  <p>{msg.content}</p>
                )}
                <div className={`flex items-center gap-1 mt-1 ${isMine ? "justify-end" : ""}`}>
                  <span className={`text-[10px] ${isMine ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                    {format(new Date(msg.created_at), "HH:mm")}
                  </span>
                  {isMine && (
                    msg.is_read ? (
                      <CheckCheck className="w-3.5 h-3.5 text-blue-300" />
                    ) : (
                      <Check className="w-3.5 h-3.5 text-primary-foreground/50" />
                    )
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}

        {/* Typing indicator */}
        {isTyping && <TypingIndicator />}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form
        onSubmit={handleSend}
        className="flex items-center gap-2 p-4 bg-card/90 backdrop-blur-xl border-t border-border"
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handlePhotoUpload}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploadingPhoto}
          className="p-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          {uploadingPhoto ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <ImagePlus className="w-5 h-5" />
          )}
        </button>
        <Input
          value={newMessage}
          onChange={handleInputChange}
          placeholder="Type a message..."
          className="flex-1 bg-secondary border-border rounded-full px-4"
        />
        <Button
          type="submit"
          size="icon"
          disabled={!newMessage.trim() || sendMutation.isPending}
          className="rounded-full gradient-primary text-primary-foreground shadow-glow w-10 h-10 flex-shrink-0"
        >
          <Send className="w-4 h-4" />
        </Button>
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
