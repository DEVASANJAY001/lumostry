import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Send, Loader2, Check, PlusSquare } from "lucide-react";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";

interface SharePostModalProps {
  post: any;
  isOpen: boolean;
  onClose: () => void;
}

export default function SharePostModal({ post, isOpen, onClose }: SharePostModalProps) {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [sending, setSending] = useState(false);

  const { data: friends = [], isLoading } = useQuery({
    queryKey: ["share-friends", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data: matches } = await supabase
        .from("matches")
        .select("*")
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`);

      if (!matches || matches.length === 0) return [];

      const otherIds = matches.map(m => m.user1_id === user.id ? m.user2_id : m.user1_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("*")
        .in("user_id", otherIds);

      return profiles || [];
    },
    enabled: isOpen && !!user,
  });

  const filteredFriends = friends.filter(f =>
    f.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    f.username?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleUserSelection = (userId: string) => {
    setSelectedUsers(prev =>
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const shareMutation = useMutation({
    mutationFn: async () => {
      if (!user || selectedUsers.length === 0) return;
      setSending(true);

      const sharePromises = selectedUsers.map(receiverId =>
        supabase.from("messages").insert({
          sender_id: user.id,
          receiver_id: receiverId,
          content: `Shared a post: ${post.caption || ""}`,
          message_type: "post_share",
          shared_post_id: post.id as any
        })
      );

      await Promise.all(sharePromises);
    },
    onSuccess: () => {
      setSending(false);
      onClose();
      setSelectedUsers([]);
    },
    onError: () => {
      toast.error("Failed to share post");
      setSending(false);
    }
  });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md w-[90vw] rounded-3xl p-0 overflow-hidden bg-background border-border/40 sm:max-w-sm">
        <DialogHeader className="p-4 border-b border-border/40">
          <DialogTitle className="text-center text-sm font-bold">Share</DialogTitle>
        </DialogHeader>

        <div className="p-4 pb-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search people..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-10 bg-secondary/50 border-0 rounded-xl text-sm"
            />
          </div>
        </div>

        <ScrollArea className="h-[300px] px-2">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground opacity-50" />
            </div>
          ) : filteredFriends.length === 0 ? (
            <div className="text-center py-20 opacity-40">
              <p className="text-xs">No people found</p>
            </div>
          ) : (
            <div className="p-2 space-y-1">
              {/* Add to Story Option */}
              <button
                onClick={() => {
                  supabase.from("stories").insert({
                    user_id: user?.id,
                    media_url: post.media_url,
                    media_type: post.media_type,
                    caption: `Via @${post.profiles?.username || "user"}`
                  }).then(({ error }) => {
                    if (error) toast.error("Failed to add to story");
                    else {
                      toast.success("Added to your story!");
                      onClose();
                    }
                  });
                }}
                className="w-full flex items-center gap-3 p-2.5 rounded-2xl hover:bg-secondary/50 transition-colors group"
              >
                <div className="w-11 h-11 rounded-full gradient-stories p-0.5 shadow-glow">
                  <div className="w-full h-full rounded-full bg-background flex items-center justify-center">
                    <PlusSquare className="w-5 h-5 text-primary" />
                  </div>
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-bold leading-tight">Add to Story</p>
                  <p className="text-[11px] text-muted-foreground">Share this post to your stories</p>
                </div>
              </button>

              <div className="h-px bg-border/20 my-2" />

              {filteredFriends.map((friend) => (
                <button
                  key={friend.id}
                  onClick={() => toggleUserSelection(friend.user_id)}
                  className="w-full flex items-center gap-3 p-2.5 rounded-2xl hover:bg-secondary/50 transition-colors group"
                >
                  <Avatar className="w-11 h-11 border border-border/20">
                    <AvatarImage src={friend.avatar_url} />
                    <AvatarFallback>{friend.name?.[0]}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-bold leading-tight">{friend.name || friend.username}</p>
                    <p className="text-[11px] text-muted-foreground">@{friend.username}</p>
                  </div>
                  <div className={`w-6 h-6 rounded-full border-2 transition-all flex items-center justify-center ${selectedUsers.includes(friend.user_id)
                    ? "bg-primary border-primary"
                    : "border-border group-hover:border-primary/50"
                    }`}>
                    {selectedUsers.includes(friend.user_id) && <Check className="w-3.5 h-3.5 text-white stroke-[3px]" />}
                  </div>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>

        <div className="p-4 pt-2 border-t border-border/40">
          <Button
            className="w-full rounded-2xl gradient-primary text-primary-foreground font-bold h-12 shadow-glow disabled:opacity-50"
            disabled={selectedUsers.length === 0 || sending}
            onClick={() => shareMutation.mutate()}
          >
            {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : "Send"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
