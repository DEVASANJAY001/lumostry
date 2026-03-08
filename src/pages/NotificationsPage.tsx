import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import BottomNav from "@/components/BottomNav";
import PageTransition from "@/components/PageTransition";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Bell, Heart, MessageCircle, UserPlus, CheckCheck, Trash2, Sparkles } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

type Notification = {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string | null;
  related_user_id: string | null;
  is_read: boolean;
  created_at: string;
};

const TYPE_ICONS: Record<string, { icon: typeof Heart; color: string }> = {
  match: { icon: Heart, color: "text-primary" },
  like: { icon: Heart, color: "text-primary" },
  message: { icon: MessageCircle, color: "text-accent" },
  friend_request: { icon: UserPlus, color: "text-success" },
  general: { icon: Bell, color: "text-muted-foreground" },
};

export default function NotificationsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ["notifications", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("notifications" as any)
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data || []) as unknown as Notification[];
    },
    enabled: !!user,
  });

  const { data: relatedProfiles = {} } = useQuery({
    queryKey: ["notification-profiles", notifications.map(n => n.related_user_id).filter(Boolean)],
    queryFn: async () => {
      const ids = [...new Set(notifications.map(n => n.related_user_id).filter(Boolean))] as string[];
      if (ids.length === 0) return {};
      const { data } = await supabase
        .from("profiles")
        .select("user_id, name, avatar_url")
        .in("user_id", ids);
      const map: Record<string, { name: string; avatar_url: string | null }> = {};
      (data || []).forEach((p: any) => { map[p.user_id] = p; });
      return map;
    },
    enabled: notifications.length > 0,
  });

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      if (!user) return;
      await supabase
        .from("notifications" as any)
        .update({ is_read: true })
        .eq("user_id", user.id)
        .eq("is_read", false);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["unread-notifications-count"] });
    },
  });

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const handleNotificationClick = (notif: Notification) => {
    // Mark as read
    supabase
      .from("notifications" as any)
      .update({ is_read: true })
      .eq("id", notif.id)
      .then();

    // Navigate based on type
    if (notif.type === "match" && notif.related_user_id) {
      navigate(`/chat/${notif.related_user_id}`);
    } else if (notif.type === "like" && notif.related_user_id) {
      navigate(`/user/${notif.related_user_id}`);
    } else if (notif.type === "friend_request") {
      navigate("/friend-requests");
    } else if (notif.type === "message" && notif.related_user_id) {
      navigate(`/chat/${notif.related_user_id}`);
    }
  };

  return (
    <PageTransition className="min-h-screen pb-20">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-1">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-lg font-heading font-bold">Notifications</h1>
          {unreadCount > 0 && (
            <p className="text-xs text-muted-foreground">{unreadCount} unread</p>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            onClick={() => markAllReadMutation.mutate()}
            className="text-xs text-primary font-medium flex items-center gap-1"
          >
            <CheckCheck className="w-4 h-4" /> Mark all read
          </button>
        )}
      </div>

      {/* Notification list */}
      <div className="divide-y divide-border">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Sparkles className="w-8 h-8 text-primary animate-spin" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-20 px-8">
            <div className="w-20 h-20 rounded-full bg-secondary flex items-center justify-center mx-auto mb-4">
              <Bell className="w-10 h-10 text-muted-foreground" />
            </div>
            <h3 className="font-heading font-semibold text-lg">No notifications yet</h3>
            <p className="text-sm text-muted-foreground mt-1">
              When someone likes you, matches, or sends a request, you'll see it here.
            </p>
          </div>
        ) : (
          <AnimatePresence>
            {notifications.map((notif, idx) => {
              const typeConfig = TYPE_ICONS[notif.type] || TYPE_ICONS.general;
              const Icon = typeConfig.icon;
              const relatedProfile = notif.related_user_id ? relatedProfiles[notif.related_user_id] : null;

              return (
                <motion.button
                  key={notif.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.03 }}
                  onClick={() => handleNotificationClick(notif)}
                  className={`w-full flex items-start gap-3 p-4 text-left transition-colors active:scale-[0.98] ${
                    notif.is_read ? "bg-background" : "bg-primary/5"
                  }`}
                >
                  {/* Avatar or icon */}
                  <div className="relative flex-shrink-0">
                    {relatedProfile?.avatar_url ? (
                      <div className="w-12 h-12 rounded-full overflow-hidden bg-secondary">
                        <img src={relatedProfile.avatar_url} alt="" className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center">
                        <Icon className={`w-6 h-6 ${typeConfig.color}`} />
                      </div>
                    )}
                    {/* Type badge */}
                    <div className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-card border-2 border-background flex items-center justify-center`}>
                      <Icon className={`w-3 h-3 ${typeConfig.color}`} fill={notif.type === "like" || notif.type === "match" ? "currentColor" : "none"} />
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className={`text-sm leading-snug ${notif.is_read ? "text-foreground" : "text-foreground font-semibold"}`}>
                      {relatedProfile ? (
                        <>
                          <span className="font-semibold">{relatedProfile.name}</span>{" "}
                          {notif.type === "like" && "liked your profile"}
                          {notif.type === "match" && "matched with you!"}
                          {notif.type === "friend_request" && "sent you a friend request"}
                          {notif.type === "message" && "sent you a message"}
                        </>
                      ) : (
                        notif.title
                      )}
                    </p>
                    {notif.body && !relatedProfile && (
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{notif.body}</p>
                    )}
                    <p className="text-[11px] text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(notif.created_at), { addSuffix: true })}
                    </p>
                  </div>

                  {/* Unread indicator */}
                  {!notif.is_read && (
                    <div className="w-2.5 h-2.5 rounded-full bg-primary flex-shrink-0 mt-2" />
                  )}
                </motion.button>
              );
            })}
          </AnimatePresence>
        )}
      </div>

      <BottomNav />
    </PageTransition>
  );
}
