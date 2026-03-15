import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import BottomNav from "@/components/BottomNav";
import PageTransition from "@/components/PageTransition";
import { Search, Loader2, Play, Users, Heart } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

export default function DiscoverPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");

  const { data: explorePosts = [], isLoading: postsLoading } = useQuery({
    queryKey: ["explore-posts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("posts")
        .select(`
          *,
          profiles (name, username, avatar_url, is_private)
        `)
        .eq("profiles.is_private", false) // Only show public posts in explore
        .order("created_at", { ascending: false })
        .limit(60);

      if (error) throw error;
      return data || [];
    }
  });

  const { data: userResults = [], isLoading: usersLoading } = useQuery({
    queryKey: ["search-users", searchQuery],
    queryFn: async () => {
      if (!searchQuery.trim()) return [];
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, name, username, avatar_url, is_verified")
        .or(`username.ilike.%${searchQuery}%,name.ilike.%${searchQuery}%`)
        .limit(10);
      
      if (error) throw error;
      return data || [];
    },
    enabled: searchQuery.length > 1
  });

  // Filter posts based on search query (hashtags or captions)
  const filteredPosts = explorePosts.filter(post => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      post.caption?.toLowerCase().includes(query) ||
      post.hashtags?.some((tag: string) => tag.toLowerCase().includes(query))
    );
  });

  return (
    <PageTransition className="min-h-screen pb-20 bg-background">
      {/* Search Header */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur-md px-4 py-3 border-b border-border">
        <div className="relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-foreground transition-colors" />
          <Input 
            placeholder="Search" 
            className="pl-10 bg-secondary/50 border-0 h-10 rounded-xl focus-visible:ring-1 focus-visible:ring-primary/20"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="max-w-md mx-auto">
        {/* Search Results (Users) */}
        <AnimatePresence>
          {searchQuery.length > 0 && userResults.length > 0 && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="px-4 py-2 space-y-4"
            >
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Accounts</h3>
              {userResults.map((u) => (
                <div 
                  key={u.user_id} 
                  className="flex items-center gap-3 cursor-pointer"
                  onClick={() => navigate(`/user/${u.user_id}`)}
                >
                  <Avatar className="w-12 h-12">
                    <AvatarImage src={u.avatar_url} />
                    <AvatarFallback>{u.name?.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col">
                    <span className="text-sm font-bold flex items-center gap-1">
                      {u.username || u.name}
                      {u.is_verified && <div className="w-3 h-3 bg-blue-500 rounded-full" />}
                    </span>
                    <span className="text-xs text-muted-foreground">{u.name}</span>
                  </div>
                </div>
              ))}
              <div className="border-b border-border pt-2" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Explore Grid */}
        {postsLoading ? (
          <div className="grid grid-cols-3 gap-0.5 mt-0.5">
            {[...Array(12)].map((_, i) => (
              <div key={i} className="aspect-square bg-secondary animate-pulse" />
            ))}
          </div>
        ) : filteredPosts.length > 0 ? (
          <div className="grid grid-cols-3 gap-0.5 mt-0.5">
            {filteredPosts.map((post, idx) => (
              <motion.div 
                key={post.id} 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: idx * 0.02 }}
                className="relative aspect-square group cursor-pointer overflow-hidden"
                onClick={() => navigate(`/feed#post-${post.id}`)}
              >
                {post.media_type === "video" ? (
                  <video src={post.media_url} className="w-full h-full object-cover" />
                ) : (
                  <img src={post.media_url} alt="" className="w-full h-full object-cover" />
                )}
                
                {/* Indicators */}
                {post.media_type === "video" && (
                  <Play className="absolute top-2 right-2 w-4 h-4 text-white drop-shadow-md fill-current" />
                )}

                {/* Hover Overlay - Simplified */}
                <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center px-6">
            <Search className="w-12 h-12 text-muted-foreground opacity-20 mb-4" />
            <p className="text-muted-foreground">No posts found for "{searchQuery}"</p>
          </div>
        )}
      </div>

      <BottomNav />
    </PageTransition>
  );
}
