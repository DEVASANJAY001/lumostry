import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, MessageCircle, Bookmark, Share2, MoreHorizontal, Send } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface PostCardProps {
  post: any;
  onLike?: () => void;
  onComment?: () => void;
  onSave?: () => void;
}

export default function PostCard({ post, onLike, onComment, onSave }: PostCardProps) {
  const { user } = useAuth();
  const [isLiked, setIsLiked] = useState(post.is_liked || false);
  const [isSaved, setIsSaved] = useState(post.is_saved || false);
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [localLikeCount, setLocalLikeCount] = useState(post.likes_count || 0);

  const handleLike = async () => {
    if (!user) return;
    const newLikedState = !isLiked;
    setIsLiked(newLikedState);
    setLocalLikeCount(prev => newLikedState ? prev + 1 : prev - 1);

    try {
      if (newLikedState) {
        await supabase.from("post_likes").insert({ post_id: post.id, user_id: user.id });
      } else {
        await supabase.from("post_likes").delete().eq("post_id", post.id).eq("user_id", user.id);
      }
      onLike?.();
    } catch (error) {
      // Revert if failed
      setIsLiked(!newLikedState);
      setLocalLikeCount(prev => !newLikedState ? prev + 1 : prev - 1);
      toast.error("Failed to update like");
    }
  };

  const handleSave = async () => {
    if (!user) return;
    const newSavedState = !isSaved;
    setIsSaved(newSavedState);

    try {
      if (newSavedState) {
        await supabase.from("post_saves").insert({ post_id: post.id, user_id: user.id });
        toast.success("Post saved to collection");
      } else {
        await supabase.from("post_saves").delete().eq("post_id", post.id).eq("user_id", user.id);
      }
      onSave?.();
    } catch (error) {
      setIsSaved(!newSavedState);
      toast.error("Failed to save post");
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card border border-border rounded-3xl overflow-hidden mb-6 shadow-sm"
    >
      {/* Post Header */}
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-3">
          <Avatar className="w-9 h-9 border border-primary/10">
            <AvatarImage src={post.profiles?.avatar_url} />
            <AvatarFallback>{post.profiles?.name?.charAt(0)}</AvatarFallback>
          </Avatar>
          <div>
            <h4 className="text-sm font-semibold leading-tight">{post.profiles?.name}</h4>
            <p className="text-[10px] text-muted-foreground">
              {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
            </p>
          </div>
        </div>
        <button className="p-2 rounded-full hover:bg-secondary transition-colors">
          <MoreHorizontal className="w-5 h-5 text-muted-foreground" />
        </button>
      </div>

      {/* Media Content */}
      <div className="relative aspect-square bg-secondary/30 overflow-hidden">
        {post.media_type === "video" ? (
          <video 
            src={post.media_url} 
            className="w-full h-full object-cover" 
            controls 
            loop 
            muted 
            playsInline
          />
        ) : (
          <img 
            src={post.media_url} 
            alt="Post content" 
            className="w-full h-full object-cover"
            onDoubleClick={handleLike}
          />
        )}
        
        {/* Heart Animation on Double Tap Placeholder */}
      </div>

      {/* Actions */}
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-4">
            <button 
              onClick={handleLike}
              className={`transition-all active:scale-90 ${isLiked ? "text-red-500" : "text-foreground hover:text-red-500"}`}
            >
              <Heart className={`w-6 h-6 ${isLiked ? "fill-current" : ""}`} />
            </button>
            <button 
              onClick={() => setShowComments(!showComments)}
              className="text-foreground hover:text-primary transition-colors"
            >
              <MessageCircle className="w-6 h-6" />
            </button>
            <button className="text-foreground hover:text-primary transition-colors">
              <Share2 className="w-6 h-6" />
            </button>
          </div>
          <button 
            onClick={handleSave}
            className={`transition-all active:scale-90 ${isSaved ? "text-primary" : "text-foreground hover:text-primary"}`}
          >
            <Bookmark className={`w-6 h-6 ${isSaved ? "fill-current" : ""}`} />
          </button>
        </div>

        {/* Likes Count */}
        <p className="text-sm font-bold mb-1">
          {localLikeCount.toLocaleString()} {localLikeCount === 1 ? "like" : "likes"}
        </p>

        {/* Caption */}
        <div className="text-sm leading-relaxed mb-1">
          <span className="font-bold mr-2">{post.profiles?.name}</span>
          {post.caption}
        </div>

        {/* Hashtags */}
        {post.hashtags && post.hashtags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {post.hashtags.map((tag: string) => (
              <span key={tag} className="text-sm text-primary font-medium hover:underline cursor-pointer">
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Comment Section (Simplified for now) */}
        {!showComments && post.comments_count > 0 && (
          <button 
            onClick={() => setShowComments(true)}
            className="text-xs text-muted-foreground mt-1 hover:text-foreground transition-colors"
          >
            View all {post.comments_count} comments
          </button>
        )}

        <AnimatePresence>
          {showComments && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="mt-3 pt-3 border-t border-border overflow-hidden"
            >
              {/* Comment Input */}
              <div className="flex items-center gap-2 mb-4">
                <Input 
                  placeholder="Add a comment..." 
                  className="bg-secondary/50 border-0 rounded-full text-xs h-9"
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                />
                <Button 
                  size="icon" 
                  disabled={!commentText.trim()}
                  className="rounded-full gradient-primary w-8 h-8 flex-shrink-0"
                  onClick={() => {
                    toast.success("Comment posted!");
                    setCommentText("");
                  }}
                >
                  <Send className="w-3.5 h-3.5" />
                </Button>
              </div>
              
              <div className="text-xs text-center text-muted-foreground py-2 italic">
                Comments are loading...
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
