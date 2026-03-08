import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, X, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
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
    setViewingGroup(group);
    setStoryIndex(0);
  };

  const nextStory = () => {
    if (!viewingGroup) return;
    if (storyIndex < viewingGroup.stories.length - 1) {
      setStoryIndex((i) => i + 1);
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
          <span className="text-[10px] text-muted-foreground">Your Story</span>
        </button>

        {/* Other users' stories */}
        {otherStories.map((group) => (
          <button
            key={group.user_id}
            onClick={() => openStory(group)}
            className="flex-shrink-0 flex flex-col items-center gap-1"
          >
            <div className="w-16 h-16 rounded-full p-[2px] bg-gradient-to-br from-primary to-accent">
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
            <span className="text-[10px] truncate w-16 text-center">{group.profile.name?.split(" ")[0]}</span>
          </button>
        ))}

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

            {/* Caption */}
            {viewingGroup.stories[storyIndex].caption && (
              <div className="absolute bottom-10 left-4 right-4 text-center">
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
    </>
  );
}
