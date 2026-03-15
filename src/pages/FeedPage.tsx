import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import PageTransition from "@/components/PageTransition";
import BottomNav from "@/components/BottomNav";
import PostCard from "@/components/PostCard";
import CreatePostModal from "@/components/CreatePostModal";
import { motion, AnimatePresence } from "framer-motion";
import { PlusSquare, Settings, Heart, Send, Loader2, Image as ImageIcon, Search, PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import StoriesBar from "@/components/StoriesBar";
import StoryViewer from "@/components/StoryViewer";
import CreateContentSelector from "@/components/CreateContentSelector";

export default function FeedPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCreateSelectorOpen, setIsCreateSelectorOpen] = useState(false);
  const [selectedCreationMode, setSelectedCreationMode] = useState<"post" | "story" | "reel">("post");
  const [selectedStoryUserId, setSelectedStoryUserId] = useState<string | null>(null);

  const { data: storiesData = [] } = useQuery({
    queryKey: ["active-stories", user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from("stories")
        .select(`
          id,
          user_id,
          profiles (username, avatar_url)
        `)
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false });

      if (error) throw error;

      const userGroups: Record<string, any> = {};

      (data || []).forEach(s => {
        if (!userGroups[s.user_id]) {
          userGroups[s.user_id] = {
            id: s.id, // ID of the latest story
            user_id: s.user_id,
            username: (s.profiles as any)?.username || "User",
            avatar_url: (s.profiles as any)?.avatar_url,
            hasUnseen: true
          };
        }
      });

      return Object.values(userGroups);
    },
    enabled: !!user
  });

  const { data: posts = [], isLoading, refetch } = useQuery({
    queryKey: ["posts", user?.id],
    queryFn: async () => {
      if (!user) return [];

      // 1. Get the list of people the user follows
      const { data: followingData } = await supabase
        .from("followers" as any)
        .select("following_id")
        .eq("follower_id", user.id);

      const followedIds = ((followingData as any) || []).map((f: any) => f.following_id);

      // 2. Query posts that are either:
      // - From public accounts (is_private = false)
      // - From people the user follows
      // - From the user themselves
      let query = supabase
        .from("posts")
        .select(`
          *,
          profiles!inner (name, username, avatar_url, is_private)
        `);

      if (followedIds.length > 0) {
        query = query.or(`profiles.is_private.eq.false,user_id.in.(${[user.id, ...followedIds].join(",")})`);
      } else {
        query = query.or(`profiles.is_private.eq.false,user_id.eq.${user.id}`);
      }

      const { data, error } = await query.order("created_at", { ascending: false });

      if (error) throw error;

      return data || [];
    },
    enabled: !!user
  });

  return (
    <PageTransition className="min-h-screen pb-20">
      {/* Lumos Header */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b border-border px-4 py-2 flex items-center justify-between">
        <h1 className="text-2xl brand-logo flex-shrink-0">Lumos</h1>

        <div className="flex items-center gap-4">
          <button
            onClick={() => setIsCreateSelectorOpen(true)}
            className="p-1 hover:bg-secondary rounded-lg transition-colors"
          >
            <PlusSquare className="w-6 h-6" />
          </button>
          <button
            onClick={() => navigate("/settings")}
            className="p-1 hover:bg-secondary rounded-lg transition-colors"
          >
            <Settings className="w-6 h-6" />
          </button>
          <div className="relative">
            <button
              onClick={() => navigate("/chats")}
              className="p-1 hover:bg-secondary rounded-lg transition-colors"
            >
              <Send className="w-6 h-6 rotate-[ -15deg]" />
            </button>
            {/* The badge will be handled by BottomNav for consistency, or we can fetch it here */}
          </div>
        </div>
      </div>

      {/* Stories Bar */}
      <StoriesBar
        stories={storiesData}
        onStoryClick={(uid) => setSelectedStoryUserId(uid)}
      />

      <StoryViewer
        userId={selectedStoryUserId}
        isOpen={!!selectedStoryUserId}
        onClose={() => setSelectedStoryUserId(null)}
      />

      {/* Posts Feed */}
      <div className="max-w-md mx-auto">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-primary animate-spin mb-4" />
            <p className="text-muted-foreground animate-pulse text-sm">Finishing up feed...</p>
          </div>
        ) : posts.length > 0 ? (
          <div className="divide-y divide-border/30">
            {posts.map((post) => (
              <PostCard key={post.id} post={post} onDelete={refetch} />
            ))}
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center py-20 text-center px-6"
          >
            <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mb-6">
              <ImageIcon className="w-8 h-8 text-muted-foreground opacity-30" />
            </div>
            <h3 className="text-lg font-heading font-semibold mb-2">Welcome to your feed</h3>
            <p className="text-muted-foreground text-xs max-w-[200px] mb-8 leading-relaxed">
              When you follow people, their photos and videos will show up here.
            </p>
            <Button
              onClick={() => setIsCreateModalOpen(true)}
              className="rounded-xl gradient-primary text-primary-foreground shadow-glow h-10 px-6 font-semibold"
            >
              Start Sharing
            </Button>
          </motion.div>
        )}
      </div>

      <CreatePostModal
        isOpen={isCreateModalOpen}
        initialMode={selectedCreationMode}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={() => {
          setIsCreateModalOpen(false);
          refetch();
        }}
      />

      <CreateContentSelector
        isOpen={isCreateSelectorOpen}
        onClose={() => setIsCreateSelectorOpen(false)}
        onSelect={(mode) => {
          setSelectedCreationMode(mode);
          setIsCreateSelectorOpen(false);
          setIsCreateModalOpen(true);
        }}
      />

      <BottomNav />
    </PageTransition>
  );
}
