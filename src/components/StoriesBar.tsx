import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, X, ChevronLeft, ChevronRight, Eye, Users, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import type { Profile } from "@/hooks/useProfile";

interface Story {
  id: string;
  user_id: string;
  media_url: string;
  caption: string | null;
  created_at: string;
  expires_at: string;
}

interface StoryGroup {
  user_id: string;
  profile: Profile;
  stories: Story[];
}

export default function StoriesBar() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [viewingGroup, setViewingGroup] = useState<StoryGroup | null>(null);
  const [storyIndex, setStoryIndex] = useState(0);
  const [showViewersForStory, setShowViewersForStory] = useState<Story | null>(null);
  const [viewers, setViewers] = useState<Profile[]>([]);
  const [loadingViewers, setLoadingViewers] = useState(false);

  const [watchedStories, setWatchedStories] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem("watched_stories");
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const markAsWatched = (userId: string) => {
    setWatchedStories((prev) => {
      if (prev.includes(userId)) return prev;
      const updated = [...prev, userId];
      localStorage.setItem("watched_stories", JSON.stringify(updated));
      return updated;
    });
  };

  const { data: storyGroups = [] } = useQuery({
    queryKey: ["stories"],
    queryFn: async () => {
      const { data: stories } = await supabase
        .from("stories" as any)
        .select("*")
        .order("created_at", { ascending: false });

      if (!stories || stories.length === 0) return [];

      const userIds = [...new Set((stories as any[]).map((s: any) => s.user_id))] as string[];
      const { data: profiles } = await supabase.from("profiles").select("*").in("user_id", userIds);

      const profileMap = new Map((profiles || []).map((p) => [p.user_id, p as Profile]));

      const groups: StoryGroup[] = [];
      for (const uid of userIds) {
        const profile = profileMap.get(uid);
        if (!profile) continue;
        groups.push({
          user_id: uid,
          profile,
          stories: (stories as any[]).filter((s: any) => s.user_id === uid),
        });
      }

      // Put current user's stories first
      return groups.sort((a, b) => (a.user_id === user?.id ? -1 : b.user_id === user?.id ? 1 : 0));
    },
    enabled: !!user,
    refetchInterval: 60000,
  });

  const { data: myStoryViews = {} } = useQuery({
    queryKey: ["my-story-views", user?.id],
    queryFn: async () => {
      if (!user) return {};
      const { data: myStories } = await supabase.from("stories" as any).select("id").eq("user_id", user.id);
      if (!myStories || myStories.length === 0) return {};

      const storyIds = myStories.map((s) => s.id);
      const { data: views } = await supabase.from("story_views" as any).select("story_id").in("story_id", storyIds);

      const counts: Record<string, number> = {};
      views?.forEach((v: any) => {
        counts[v.story_id] = (counts[v.story_id] || 0) + 1;
      });
      return counts;
    },
    enabled: !!user,
    refetchInterval: 10000,
  });

  const recordViewMutation = useMutation({
    mutationFn: async (storyId: string) => {
      if (!user) return;
      const { error } = await supabase.from("story_views" as any).upsert({
        story_id: storyId,
        viewer_id: user.id
      }, { onConflict: 'story_id,viewer_id' });
      if (error && error.code !== '23505') console.error("Error recording view:", error);
    }
  });

  const fetchViewers = async (story: Story) => {
    setLoadingViewers(true);
    setShowViewersForStory(story);
    try {
      const { data: viewRecords } = await supabase
        .from("story_views" as any)
        .select("viewer_id")
        .eq("story_id", story.id);
      
      if (!viewRecords || viewRecords.length === 0) {
        setViewers([]);
        return;
      }

      const viewerIds = viewRecords.map(v => v.viewer_id);
      const { data: profiles } = await supabase.from("profiles").select("*").in("user_id", viewerIds);
      setViewers((profiles || []) as Profile[]);
    } catch (error) {
      console.error("Error fetching viewers:", error);
    } finally {
      setLoadingViewers(false);
    }
  };

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      if (!user) throw new Error("Not logged in");
      const ext = file.name.split(".").pop();
      const path = `${user.id}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("photos").upload(path, file);
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from("photos").getPublicUrl(path);

      const { error } = await supabase.from("stories" as any).insert({
        user_id: user.id,
        media_url: urlData.publicUrl,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stories"] });
      toast.success("Story added! ✨");
    },
    onError: () => toast.error("Failed to upload story"),
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadMutation.mutate(file);
    e.target.value = "";
  };

  const myStories = storyGroups.find((g) => g.user_id === user?.id);
  const otherStories = storyGroups.filter((g) => g.user_id !== user?.id);

  const openStory = (group: StoryGroup) => {
    markAsWatched(group.user_id);
    setViewingGroup(group);
    setStoryIndex(0);
    
    // Record view if not own story
    if (user && group.user_id !== user.id) {
      recordViewMutation.mutate(group.stories[0].id);
    }
  };

  const nextStory = () => {
    if (!viewingGroup) return;
    const nextIdx = storyIndex + 1;
    if (nextIdx < viewingGroup.stories.length) {
      setStoryIndex(nextIdx);
      if (user && viewingGroup.user_id !== user.id) {
        recordViewMutation.mutate(viewingGroup.stories[nextIdx].id);
      }
    } else {
      setViewingGroup(null);
    }
  };

  const prevStory = () => {
    if (storyIndex > 0) setStoryIndex((i) => i - 1);
  };

  return (
    <>
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />

      <div className="flex gap-3 overflow-x-auto px-4 py-3 scrollbar-hide">
        {/* Add story button */}
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex-shrink-0 flex flex-col items-center gap-1"
        >
          <div className="relative w-16 h-16 rounded-full bg-secondary flex items-center justify-center">
            {myStories ? (
              <>
                <img src={myStories.profile.avatar_url || ""} alt="" className="w-full h-full rounded-full object-cover" />
                <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full gradient-primary flex items-center justify-center border-2 border-background">
                  <Plus className="w-3 h-3 text-primary-foreground" />
                </div>
              </>
            ) : (
              <div className="w-full h-full rounded-full border-2 border-dashed border-muted-foreground/30 flex items-center justify-center">
                <Plus className="w-5 h-5 text-muted-foreground" />
              </div>
            )}
          </div>
          <div className="flex flex-col items-center">
            <span className="text-[10px] text-muted-foreground">Your Story</span>
            {myStories && (
              <div className="flex items-center gap-0.5 text-[9px] text-primary font-bold">
                <Eye className="w-2.5 h-2.5" />
                {Object.values(myStoryViews).reduce((a: number, b: number) => a + b, 0)}
              </div>
            )}
          </div>
        </button>

        {/* Other users' stories */}
        {otherStories.map((group) => {
          const isWatched = watchedStories.includes(group.user_id);
          return (
            <button
              key={group.user_id}
              onClick={() => openStory(group)}
              className="flex-shrink-0 flex flex-col items-center gap-1 active:scale-95 transition-transform"
            >
              <div className={`w-16 h-16 rounded-full p-[2px] transition-colors duration-500 ${isWatched ? "bg-muted" : "bg-gradient-to-tr from-amber-400 via-rose-500 to-fuchsia-600"}`}>
                <div className="w-full h-full rounded-full overflow-hidden border-2 border-background">
                {group.profile.avatar_url ? (
                  <img src={group.profile.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-secondary flex items-center justify-center text-sm">
                    {group.profile.name?.[0]}
                  </div>
                )}
                </div>
              </div>
              <span className={`text-[10px] truncate w-16 text-center transition-colors ${isWatched ? "text-muted-foreground" : "text-foreground font-medium"}`}>
                {group.profile.name?.split(" ")[0]}
              </span>
            </button>
          );
        })}

        {/* My story circle (tap to view) */}
        {myStories && (
          <button
            onClick={() => openStory(myStories)}
            className="flex-shrink-0 flex flex-col items-center gap-1 ml-[-76px] opacity-0 pointer-events-none"
          >
            <div className="w-16 h-16" />
          </button>
        )}
      </div>

      {/* Story Viewer */}
      <AnimatePresence>
        {viewingGroup && viewingGroup.stories[storyIndex] && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black flex flex-col"
          >
            {/* Progress bars */}
            <div className="absolute top-2 left-3 right-3 flex gap-1 z-20">
              {viewingGroup.stories.map((_, i) => (
                <div key={i} className="h-[2px] flex-1 rounded-full bg-white/25 overflow-hidden">
                  <motion.div
                    className="h-full bg-white"
                    initial={{ width: "0%" }}
                    animate={{ width: i === storyIndex ? "100%" : i < storyIndex ? "100%" : "0%" }}
                    transition={i === storyIndex ? { duration: 5, ease: "linear" } : { duration: 0 }}
                    onAnimationComplete={() => { if (i === storyIndex) nextStory(); }}
                  />
                </div>
              ))}
            </div>

            {/* Header */}
            <div className="absolute top-6 left-3 right-3 flex items-center justify-between z-20">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full overflow-hidden bg-white/20">
                  {viewingGroup.profile.avatar_url && (
                    <img src={viewingGroup.profile.avatar_url} alt="" className="w-full h-full object-cover" />
                  )}
                </div>
                <span className="text-white text-sm font-medium">{viewingGroup.profile.name}</span>
              </div>
              <button onClick={() => setViewingGroup(null)} className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                <X className="w-4 h-4 text-white" />
              </button>
            </div>

            {/* Image */}
            <img
              src={viewingGroup.stories[storyIndex].media_url}
              alt=""
              className="w-full h-full object-contain"
            />

            {/* Owner view count */}
            {user?.id === viewingGroup.user_id && (
              <div className="absolute bottom-10 left-0 right-0 flex justify-center z-20">
                <button 
                  onClick={() => fetchViewers(viewingGroup.stories[storyIndex])}
                  className="bg-black/40 backdrop-blur-md px-4 py-2 rounded-full flex items-center gap-2 border border-white/10 active:scale-95 transition-transform"
                >
                  <Eye className="w-4 h-4 text-white" />
                  <span className="text-white text-xs font-semibold">
                    {myStoryViews[viewingGroup.stories[storyIndex].id] || 0} Views
                  </span>
                </button>
              </div>
            )}

            {/* Caption */}
            {viewingGroup.stories[storyIndex].caption && (
              <div className={`absolute left-4 right-4 text-center z-20 ${user?.id === viewingGroup.user_id ? 'bottom-24' : 'bottom-10'}`}>
                <p className="text-white text-sm bg-black/40 backdrop-blur-sm px-4 py-2 rounded-xl inline-block">
                  {viewingGroup.stories[storyIndex].caption}
                </p>
              </div>
            )}

            {/* Tap areas */}
            <div className="absolute inset-0 flex z-10">
              <div className="flex-1" onClick={prevStory} />
              <div className="flex-1" onClick={nextStory} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Viewers List Modal */}
      <AnimatePresence>
        {showViewersForStory && (
          <div className="fixed inset-0 z-[110] flex items-end justify-center pointer-events-none">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 pointer-events-auto"
              onClick={() => setShowViewersForStory(null)}
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="relative w-full max-w-md bg-card rounded-t-3xl p-6 pointer-events-auto shadow-2xl overflow-hidden"
              style={{ maxHeight: "70vh" }}
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Users className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-heading font-bold">Story Viewers</h3>
                    <p className="text-xs text-muted-foreground">{viewers.length} people watched</p>
                  </div>
                </div>
                <button onClick={() => setShowViewersForStory(null)} className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="overflow-y-auto pr-1" style={{ maxHeight: "calc(70vh - 120px)" }}>
                {loadingViewers ? (
                  <div className="flex flex-col items-center py-12">
                    <Loader2 className="w-8 h-8 text-primary animate-spin mb-2" />
                    <p className="text-sm text-muted-foreground">Loading viewers...</p>
                  </div>
                ) : viewers.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-muted-foreground italic">No viewers yet</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {viewers.map((viewer) => (
                      <div 
                        key={viewer.user_id} 
                        className="flex items-center justify-between group cursor-pointer"
                        onClick={() => navigate(`/profile/${viewer.user_id}`)}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-full overflow-hidden bg-secondary border border-border">
                            {viewer.avatar_url ? (
                              <img src={viewer.avatar_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-lg">
                                {viewer.gender === "female" ? "👩" : "👨"}
                              </div>
                            )}
                          </div>
                          <div>
                            <p className="font-semibold text-sm">{viewer.name || viewer.username}</p>
                            <p className="text-[10px] text-muted-foreground">Recently viewed</p>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
