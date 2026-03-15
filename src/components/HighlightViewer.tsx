import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";

interface HighlightViewerProps {
  highlight: any | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function HighlightViewer({ highlight, isOpen, onClose }: HighlightViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [progress, setProgress] = useState(0);

  const { data: stories = [], isLoading } = useQuery({
    queryKey: ["highlight-stories", highlight?.id],
    queryFn: async () => {
      if (!highlight) return [];
      const { data, error } = await (supabase
        .from("highlight_items" as any)
        .select(`
          story_id,
          stories (*)
        `)
        .eq("highlight_id", highlight.id)
        .order("created_at", { ascending: true }) as any);
      
      if (error) throw error;
      return (data || []).map((item: any) => item.stories) as any[];
    },
    enabled: isOpen && !!highlight,
  });

  useEffect(() => {
    if (!isOpen) {
      setCurrentIndex(0);
      setProgress(0);
      return;
    }

    if (stories.length > 0) {
      const interval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 100) {
            handleNext();
            return 0;
          }
          return prev + 1;
        });
      }, 50); // 5 seconds total (100 * 50ms)

      return () => clearInterval(interval);
    }
  }, [isOpen, currentIndex, stories.length]);

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

  if (!highlight) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md w-full h-[100vh] sm:h-[90vh] p-0 border-0 bg-black overflow-hidden flex flex-col focus:outline-none">
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-white opacity-50" />
          </div>
        ) : stories.length > 0 ? (
          <div className="relative flex-1 flex flex-col">
            {/* Progress Bars */}
            <div className="absolute top-2 left-2 right-2 flex gap-1 z-50">
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
            <div className="absolute top-6 left-4 right-4 flex items-center justify-between z-50">
              <div className="flex items-center gap-2">
                <Avatar className="w-8 h-8 border border-white/20">
                  <AvatarImage src={highlight.cover_url} />
                  <AvatarFallback>{highlight.title.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="flex flex-col">
                  <span className="text-white text-xs font-bold shadow-sm">{highlight.title}</span>
                  <span className="text-white/60 text-[10px] shadow-sm">
                    {formatDistanceToNow(new Date(stories[currentIndex].created_at), { addSuffix: true })}
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
                  key={stories[currentIndex].id}
                  initial={{ opacity: 0, scale: 1.1 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.3 }}
                  className="w-full h-full"
                >
                  <img 
                    src={stories[currentIndex].media_url} 
                    className="w-full h-full object-cover" 
                    alt="Story content"
                  />
                </motion.div>
              </AnimatePresence>

              {/* Navigation Zones */}
              <div className="absolute inset-0 flex z-40">
                <div className="w-1/3 h-full cursor-pointer" onClick={handlePrev} />
                <div className="w-2/3 h-full cursor-pointer" onClick={handleNext} />
              </div>

              {/* Caption */}
              {stories[currentIndex].caption && (
                <div className="absolute bottom-10 left-0 right-0 p-6 bg-gradient-to-t from-black/60 to-transparent z-50">
                  <p className="text-white text-sm text-center leading-relaxed font-medium">
                    {stories[currentIndex].caption}
                  </p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-white p-10 text-center">
            <p className="opacity-60 mb-4">This highlight has no stories.</p>
            <Button onClick={onClose} variant="secondary" className="rounded-full">Close</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
