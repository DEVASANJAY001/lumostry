import { useState, useEffect } from "react";
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
  onReport?: () => void;
}

export default function PostCard({ post, onLike, onComment, onSave, onReport }: PostCardProps) {
  const { user } = useAuth();
  const [isLiked, setIsLiked] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<any[]>([]);
  const [commentText, setCommentText] = useState("");
  const [replyingTo, setReplyingTo] = useState<any>(null);
  const [likeCount, setLikeCount] = useState(0);
  const [commentCount, setCommentCount] = useState(0);
  const [loadingComments, setLoadingComments] = useState(false);

  useEffect(() => {
    if (!user || !post.id) return;
    
    // Fetch initial state
    const fetchStates = async () => {
      const [{ data: liked }, { data: saved }, { count: likes }, { count: msgs }] = await Promise.all([
        supabase.from("post_likes").select("id").eq("post_id", post.id).eq("user_id", user.id).maybeSingle(),
        supabase.from("post_saves").select("id").eq("post_id", post.id).eq("user_id", user.id).maybeSingle(),
        supabase.from("post_likes").select("id", { count: "exact", head: true }).eq("post_id", post.id),
        supabase.from("post_comments").select("id", { count: "exact", head: true }).eq("post_id", post.id)
      ]);
      
      setIsLiked(!!liked);
      setIsSaved(!!saved);
      setLikeCount(likes || 0);
      setCommentCount(msgs || 0);
    };

    fetchStates();
  }, [post.id, user]);

  const fetchComments = async () => {
    setLoadingComments(true);
    const { data } = await supabase
      .from("post_comments")
      .select(`
        *,
        profiles:user_id (name, avatar_url)
      `)
      .eq("post_id", post.id)
      .order("created_at", { ascending: true });
    
    setComments(data || []);
    setLoadingComments(false);
  };

  useEffect(() => {
    if (showComments) fetchComments();
  }, [showComments]);

  const handleLike = async () => {
    if (!user) return;
    const previousLiked = isLiked;
    const newLiked = !isLiked;
    
    setIsLiked(newLiked);
    setLikeCount(prev => newLiked ? prev + 1 : prev - 1);

    try {
      if (newLiked) {
        await supabase.from("post_likes").insert({ post_id: post.id, user_id: user.id });
      } else {
        await supabase.from("post_likes").delete().eq("post_id", post.id).eq("user_id", user.id);
      }
      onLike?.();
    } catch (error) {
      setIsLiked(previousLiked);
      setLikeCount(prev => previousLiked ? prev + 1 : prev - 1);
      toast.error("Failed to update like");
    }
  };

  const handleSave = async () => {
    if (!user) return;
    const previousSaved = isSaved;
    setIsSaved(!isSaved);

    try {
      if (!isSaved) {
        await supabase.from("post_saves").insert({ post_id: post.id, user_id: user.id });
        toast.success("Added to saved posts");
      } else {
        await supabase.from("post_saves").delete().eq("post_id", post.id).eq("user_id", user.id);
      }
      onSave?.();
    } catch (error) {
      setIsSaved(previousSaved);
      toast.error("Failed to update save");
    }
  };

  const handleAddComment = async () => {
    if (!user || !commentText.trim()) return;
    const text = commentText;
    const parentId = replyingTo?.id;
    setCommentText("");
    setReplyingTo(null);

    try {
      const { data, error } = await supabase
        .from("post_comments")
        .insert({ 
          post_id: post.id, 
          user_id: user.id, 
          content: text,
          parent_id: parentId
        })
        .select(`
          *,
          profiles:user_id (name, avatar_url)
        `)
        .single();

      if (error) throw error;
      setComments(prev => [...prev, data]);
      setCommentCount(prev => prev + 1);
      toast.success(parentId ? "Reply posted" : "Comment posted");
    } catch (error) {
      toast.error("Failed to post");
      setCommentText(text);
    }
  };

  const handleReport = () => {
    toast.success("Post reported. Our team will review it.");
    onReport?.();
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-background border-b border-border/50 overflow-hidden mb-2"
    >
      {/* Post Header */}
      <div className="flex items-center justify-between px-3 py-2.5">
        <div className="flex items-center gap-2.5">
          <div className="p-0.5 rounded-full gradient-stories">
            <div className="p-0.5 bg-background rounded-full">
              <Avatar className="w-8 h-8">
                <AvatarImage src={post.profiles?.avatar_url} />
                <AvatarFallback>{post.profiles?.name?.charAt(0)}</AvatarFallback>
              </Avatar>
            </div>
          </div>
          <div className="flex flex-col">
            <h4 className="text-[13px] font-bold leading-none flex items-center gap-1">
              {post.profiles?.username || post.profiles?.name}
              {post.profiles?.is_verified && <div className="w-3 h-3 bg-blue-500 rounded-full flex items-center justify-center"><Send className="w-2 h-2 text-white fill-current" /></div>}
            </h4>
            <span className="text-[11px] text-foreground/80 mt-0.5">Tamil Nadu</span>
          </div>
        </div>
        <button 
          onClick={handleReport}
          className="p-1.5"
        >
          <MoreHorizontal className="w-5 h-5" />
        </button>
      </div>

      {/* Media Content */}
      <div className="relative aspect-square bg-secondary/20 overflow-hidden">
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
      </div>

      {/* Actions */}
      <div className="px-3 py-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-4">
            <button 
              onClick={handleLike}
              className={`transition-all active:scale-90 ${isLiked ? "text-red-500" : "text-foreground hover:text-red-500"}`}
            >
              <Heart className={`w-7 h-7 ${isLiked ? "fill-current" : ""}`} />
            </button>
            <button 
              onClick={() => setShowComments(!showComments)}
              className="text-foreground active:scale-90 transition-all"
            >
              <MessageCircle className="w-7 h-7" />
            </button>
            <button className="text-foreground active:scale-90 transition-all">
              <Send className="w-7 h-7 rotate-[-15deg]" />
            </button>
          </div>
          <button 
            onClick={handleSave}
            className={`transition-all active:scale-90 ${isSaved ? "text-foreground" : "text-foreground hover:text-primary"}`}
          >
            <Bookmark className={`w-7 h-7 ${isSaved ? "fill-current" : ""}`} />
          </button>
        </div>

        {/* Likes Count */}
        <p className="text-[13px] font-bold mb-1.5">
          {likeCount.toLocaleString()} {likeCount === 1 ? "like" : "likes"}
        </p>

        {/* Caption */}
        <div className="text-[13px] leading-[18px] mb-1.5 flex flex-wrap gap-x-1.5">
          <span className="font-bold">{post.profiles?.username || post.profiles?.name}</span>
          <span className="text-foreground/90">{post.caption}</span>
        </div>

        {/* Hashtags */}
        {post.hashtags && post.hashtags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-1.5">
            {post.hashtags.map((tag: string) => (
              <span key={tag} className="text-[13px] text-blue-800 dark:text-blue-400 font-medium hover:underline cursor-pointer">
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Comment Section */}
        {commentCount > 0 && (
          <button 
            onClick={() => setShowComments(true)}
            className="text-[13px] text-muted-foreground mt-0.5 hover:text-foreground transition-colors"
          >
            View all {commentCount} comments
          </button>
        )}

        <div className="text-[10px] text-muted-foreground mt-1.5 uppercase tracking-tight">
          {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
        </div>

        <AnimatePresence>
          {showComments && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="mt-3 pt-3 border-t border-border overflow-hidden"
            >
              <div className="space-y-3 mb-4 max-h-40 overflow-y-auto pr-2 scrollbar-hide">
                {loadingComments ? (
                  <div className="text-center py-2"><Loader2 className="w-4 h-4 animate-spin mx-auto text-muted-foreground" /></div>
                ) : comments.map((comment) => (
                  <div key={comment.id} className={`flex flex-col gap-1 ${comment.parent_id ? "ml-6 border-l-2 border-primary/10 pl-3" : ""}`}>
                    <div className="flex gap-2 text-xs">
                      <span className="font-bold whitespace-nowrap">{comment.profiles?.name}</span>
                      <span className="text-muted-foreground leading-snug">{comment.content}</span>
                    </div>
                    {!comment.parent_id && (
                      <button 
                        onClick={() => {
                          setReplyingTo(comment);
                          setCommentText(`@${comment.profiles?.name} `);
                        }}
                        className="text-[10px] text-primary font-bold hover:underline w-fit"
                      >
                        Reply
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {replyingTo && (
                <div className="flex items-center justify-between px-3 py-1.5 bg-primary/5 rounded-t-xl text-[10px] border-x border-t border-primary/20">
                  <span className="text-muted-foreground">Replying to <span className="font-bold text-primary">{replyingTo.profiles?.name}</span></span>
                  <button onClick={() => setReplyingTo(null)} className="text-muted-foreground hover:text-foreground">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}

              <div className="flex items-center gap-2 mb-2">
                <Input 
                  placeholder={replyingTo ? "Write a reply..." : "Add a comment..."} 
                  className={`bg-secondary/50 border-0 text-[13px] h-9 ${replyingTo ? "rounded-b-2xl rounded-t-none" : "rounded-full"}`}
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddComment()}
                />
                <Button 
                  size="icon" 
                  disabled={!commentText.trim()}
                  className="rounded-full gradient-primary w-8 h-8 flex-shrink-0"
                  onClick={handleAddComment}
                >
                  <Send className="w-3.5 h-3.5" />
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
