import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import PageTransition from "@/components/PageTransition";
import BottomNav from "@/components/BottomNav";
import PostCard from "@/components/PostCard";
import CreatePostModal from "@/components/CreatePostModal";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Sparkles, Loader2, Image as ImageIcon, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export default function FeedPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const { data: posts = [], isLoading, refetch } = useQuery({
    queryKey: ["posts"],
    queryFn: async () => {
      // In a real app, we'd join with likes/saves for the current user
      const { data, error } = await supabase
        .from("posts")
        .select(`
          *,
          profiles:user_id (name, username, avatar_url)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      // Mocking some counts for now since we don't have aggregation queries yet
      return (data || []).map(post => ({
        ...post,
        likes_count: Math.floor(Math.random() * 50),
        comments_count: Math.floor(Math.random() * 10),
        is_liked: false,
        is_saved: false
      }));
    },
    enabled: !!user
  });

  return (
    <PageTransition className="min-h-screen pb-24 bg-secondary/5">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-primary" />
            <h1 className="text-xl font-heading font-bold text-gradient">Feed</h1>
          </div>
          <button 
            onClick={() => navigate("/search")}
            className="p-2 rounded-full bg-secondary/50 text-muted-foreground hover:text-primary transition-all"
          >
            <Search className="w-4 h-4" />
          </button>
        </div>
        <Button 
          size="sm" 
          onClick={() => setIsCreateModalOpen(true)}
          className="rounded-full gradient-primary text-primary-foreground shadow-glow h-9 px-4"
        >
          <Plus className="w-4 h-4 mr-1.5" /> Post
        </Button>
      </div>

      <div className="max-w-md mx-auto p-4">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-primary animate-spin mb-4" />
            <p className="text-muted-foreground animate-pulse">Loading your feed...</p>
          </div>
        ) : posts.length > 0 ? (
          <div className="space-y-2">
            {posts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        ) : (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center py-20 text-center"
          >
            <div className="w-20 h-20 rounded-full bg-secondary flex items-center justify-center mb-6">
              <ImageIcon className="w-10 h-10 text-muted-foreground opacity-20" />
            </div>
            <h3 className="text-lg font-heading font-semibold mb-2">No posts yet</h3>
            <p className="text-muted-foreground text-sm max-w-[240px] mb-8">
              Be the first to share a moment with the community!
            </p>
            <Button 
              onClick={() => setIsCreateModalOpen(true)}
              variant="outline"
              className="rounded-full border-primary/20 text-primary hover:bg-primary/5"
            >
              Share your first post
            </Button>
          </motion.div>
        )}
      </div>

      <CreatePostModal 
        isOpen={isCreateModalOpen} 
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={() => {
          setIsCreateModalOpen(false);
          refetch();
        }}
      />

      <BottomNav />
    </PageTransition>
  );
}
