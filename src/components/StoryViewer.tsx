import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Loader2, X, Eye, ChevronLeft, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import CreatePostModal from "./CreatePostModal";

interface StoryViewerProps {
  userId: string | null; // The user whose stories we are viewing
  isOpen: boolean;
  onClose: () => void;
}

export default function StoryViewer({ userId, isOpen, onClose }: StoryViewerProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [showViewers, setShowViewers] = useState(false);
  const [isRetagModalOpen, setIsRetagModalOpen] = useState(false);

  const { data: stories = [], isLoading } = useQuery({
    queryKey: ["user-stories", userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await (supabase
        .from("stories")
        .select(`
          *,
          profiles:user_id (username, avatar_url),
          story_mentions(user_id, profiles:user_id(username))
        `)
        .eq("user_id", userId)
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: true }) as any);
      
      if (error) throw error;
      return (data || []) as any[];
    },
    enabled: isOpen && !!userId,
  });

  const { data: viewers = [] } = useQuery({
    queryKey: ["story-viewers", stories[currentIndex]?.id],
    queryFn: async () => {
      if (!stories[currentIndex]?.id || stories[currentIndex]?.user_id !== user?.id) return [];
      const { data, error } = await supabase
        .from("story_views")
        .select(`
          viewed_at,
          profiles:viewer_id (username, avatar_url, name)
        `)
        .eq("story_id", stories[currentIndex].id)
        .order("viewed_at", { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: isOpen && stories.length > 0 && stories[currentIndex]?.user_id === user?.id,
  });

  const recordViewMutation = useMutation({
    mutationFn: async (storyId: string) => {
      if (!user || userId === user.id) return;
      await supabase
        .from("story_views")
        .upsert({ story_id: storyId, viewer_id: user.id }, { onConflict: "story_id,viewer_id" });
    },
  });

  useEffect(() => {
    if (stories.length > 0 && isOpen && stories[currentIndex]) {
      recordViewMutation.mutate(stories[currentIndex].id);
    }
  }, [currentIndex, stories.length, isOpen]);

  useEffect(() => {
    if (!isOpen) {
      setCurrentIndex(0);
      setProgress(0);
      setShowViewers(false);
      return;
    }

    if (stories.length > 0 && !showViewers) {
      const interval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 100) {
            handleNext();
            return 0;
          }
          return prev + 1;
        });
      }, 50);

      return () => clearInterval(interval);
    }
  }, [isOpen, currentIndex, stories.length, showViewers]);

  const handleNext = () => {
    if (currentIndex < stories.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setProgress(0);
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
      setProgress(0);
    }
  };

  if (!userId) return null;

  const currentStory = stories[currentIndex];
  const isOwner = currentStory?.user_id === user?.id;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md w-full h-[100vh] sm:h-[95vh] p-0 border-0 bg-black overflow-hidden flex flex-col focus:outline-none z-[200]">
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-white opacity-50 transition-opacity" />
          </div>
        ) : stories.length > 0 ? (
          <div className="relative flex-1 flex flex-col">
            {/* Progress Bars */}
            <div className="absolute top-2 left-2 right-2 flex gap-1 z-[60]">
              {stories.map((_, idx) => (
                <div key={idx} className="h-0.5 flex-1 bg-white/20 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-white transition-all duration-50 linear"
                    style={{ 
                      width: idx === currentIndex ? `${progress}%` : idx < currentIndex ? "100%" : "0%" 
                    }}
                  />
                </div>
              ))}
            </div>

            {/* Header */}
            <div className="absolute top-6 left-4 right-4 flex items-center justify-between z-[60]">
              <div className="flex items-center gap-2">
                <Avatar className="w-8 h-8 border border-white/20">
                  <AvatarImage src={currentStory.profiles?.avatar_url} />
                  <AvatarFallback>{currentStory.profiles?.username?.[0]}</AvatarFallback>
                </Avatar>
                <div className="flex flex-col">
                  <span className="text-white text-xs font-bold shadow-sm">{currentStory.profiles?.username}</span>
                  <span className="text-white/60 text-[10px] shadow-sm">
                    {formatDistanceToNow(new Date(currentStory.created_at), { addSuffix: true })}
                  </span>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="p-2 text-white/80 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Media Content */}
            <div className="flex-1 overflow-hidden relative">
              <AnimatePresence mode="wait">
                <motion.div 
                  key={currentStory.id}
                  initial={{ opacity: 0, scale: 1.05 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.3 }}
                  className="w-full h-full"
                >
                  <img 
                    src={currentStory.media_url} 
                    className="w-full h-full object-cover" 
                    alt=""
                  />
                  
                  {/* Mentions Display */}
                  {currentStory.story_mentions?.length > 0 && (
                     <div className="absolute bottom-32 left-0 right-0 px-6 flex flex-wrap gap-2 z-[65] pointer-events-none">
                        {currentStory.story_mentions.map((m: any, i: number) => (
                           <motion.div 
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              key={i} 
                              className="bg-black/30 backdrop-blur-md px-3 py-1.5 rounded-full text-[11px] font-bold text-white border border-white/20"
                           >
                              @{m.profiles?.username}
                           </motion.div>
                        ))}
                     </div>
                  )}
                </motion.div>
              </AnimatePresence>

              {/* Navigation Zones */}
              {!showViewers && (
                <div className="absolute inset-0 flex z-[55]">
                  <div className="w-1/3 h-full cursor-pointer" onClick={handlePrev} />
                  <div className="w-2/3 h-full cursor-pointer" onClick={handleNext} />
                </div>
              )}

              {/* Caption */}
              {currentStory.caption && (
                <div className="absolute bottom-20 left-0 right-0 p-6 bg-gradient-to-t from-black/80 to-transparent z-[60]">
                  <p className="text-white text-sm text-center font-medium shadow-sm">
                    {currentStory.caption}
                  </p>
                </div>
              )}

              {/* Viewer Count & List (Owner Only) */}
              {isOwner && (
                <div className="absolute bottom-6 left-0 right-0 flex justify-center z-[70]">
                  <button 
                    onClick={() => setShowViewers(true)}
                    className="flex flex-col items-center gap-1 group active:scale-95 transition-transform"
                  >
                    <div className="flex -space-x-2">
                      {viewers.slice(0, 3).map((v: any, i) => (
                        <Avatar key={i} className="w-6 h-6 border-2 border-black">
                          <AvatarImage src={v.profiles?.avatar_url} />
                          <AvatarFallback className="text-[8px] bg-secondary">{v.profiles?.username?.[0]}</AvatarFallback>
                        </Avatar>
                      ))}
                    </div>
                    <span className="text-white/80 text-[11px] font-bold group-hover:text-white flex items-center gap-1.5">
                      <Eye className="w-3.5 h-3.5" />
                      {viewers.length} {viewers.length === 1 ? "view" : "views"}
                    </span>
                  </button>
                </div>
              )}

              {/* Retag Button (If mentioned) */}
              {!isOwner && currentStory?.story_mentions?.some((m: any) => m.user_id === user?.id) && (
                <div className="absolute bottom-6 left-0 right-0 flex justify-center z-[70]">
                  <Button 
                    onClick={() => setIsRetagModalOpen(true)}
                    className="rounded-full bg-white text-black hover:bg-white/90 font-bold px-6 h-10 shadow-glow active:scale-95 transition-all"
                  >
                    Add to your story
                  </Button>
                </div>
              )}
            </div>

            {/* Viewer List Bottom Sheet */}
            <AnimatePresence>
              {showViewers && (
                <motion.div
                  initial={{ y: "100%" }}
                  animate={{ y: 0 }}
                  exit={{ y: "100%" }}
                  transition={{ type: "spring", damping: 25, stiffness: 200 }}
                  className="absolute inset-0 z-[100] bg-background/95 backdrop-blur-xl flex flex-col"
                >
                  <div className="flex items-center justify-between p-4 border-b border-border/40">
                    <h3 className="text-sm font-bold flex items-center gap-2">
                      <Eye className="w-4 h-4" /> Viewers ({viewers.length})
                    </h3>
                    <button onClick={() => setShowViewers(false)} className="p-1 hover:bg-secondary rounded-full transition-colors">
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  <ScrollArea className="flex-1">
                    <div className="p-2 space-y-1">
                      {viewers.map((v: any, i) => (
                        <div key={i} className="flex items-center gap-3 p-2 hover:bg-secondary/40 rounded-xl transition-colors cursor-default">
                          <Avatar className="w-10 h-10">
                            <AvatarImage src={v.profiles?.avatar_url} />
                            <AvatarFallback>{v.profiles?.username?.[0]}</AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col">
                            <span className="text-[13px] font-bold">{v.profiles?.username}</span>
                            <span className="text-[11px] text-muted-foreground">{v.profiles?.name}</span>
                          </div>
                          <span className="ml-auto text-[10px] text-muted-foreground">
                            {formatDistanceToNow(new Date(v.viewed_at), { addSuffix: true })}
                          </span>
                        </div>
                      ))}
                      {viewers.length === 0 && (
                        <div className="py-20 text-center flex flex-col items-center gap-3 opacity-40">
                          <Eye className="w-10 h-10" />
                          <p className="text-sm font-medium">No views yet</p>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-white p-10 text-center">
            <p className="opacity-60 mb-4">No active stories available.</p>
            <Button onClick={onClose} variant="secondary" className="rounded-full">Close</Button>
          </div>
        )}
      </DialogContent>

      {/* Retagging creates a new story with the same media */}
      <CreatePostModal
        isOpen={isRetagModalOpen}
        onClose={() => setIsRetagModalOpen(false)}
        initialMode="story"
        onSuccess={() => {
           setIsRetagModalOpen(false);
           toast.success("Retagged to your story! 🔄");
        }}
      />
    </Dialog>
  );
}
