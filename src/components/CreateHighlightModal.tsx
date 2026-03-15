import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Check, X, ChevronRight, ChevronLeft } from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { motion, AnimatePresence } from "framer-motion";

interface CreateHighlightModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CreateHighlightModal({ isOpen, onClose, onSuccess }: CreateHighlightModalProps) {
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [selectedStoryIds, setSelectedStoryIds] = useState<string[]>([]);
  const [step, setStep] = useState<"stories" | "details">("stories");
  const [loading, setLoading] = useState(false);

  // Fetch all stories for the user (including expired ones)
  const { data: userStories = [], isLoading } = useQuery({
    queryKey: ["user-all-stories", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("stories")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: isOpen && !!user,
  });

  const toggleStory = (id: string) => {
    setSelectedStoryIds(prev => 
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  const handleCreate = async () => {
    if (!user || !title.trim() || selectedStoryIds.length === 0) return;
    setLoading(true);
    try {
      // 1. Create the highlight
      // Note: We'll use the first selected story's media_url as a temporary cover
      const coverUrl = userStories.find(s => s.id === selectedStoryIds[0])?.media_url;

      const { data: highlight, error: hError } = await (supabase
        .from("highlights" as any)
        .insert({
          user_id: user.id,
          title: title.trim(),
          cover_url: coverUrl
        })
        .select()
        .single() as any);

      if (hError) throw hError;

      // 2. Add highlight items
      const items = selectedStoryIds.map(storyId => ({
        highlight_id: highlight.id,
        story_id: storyId
      }));

      const { error: iError } = await supabase
        .from("highlight_items")
        .insert(items);

      if (iError) throw iError;

      toast.success("Highlight created!");
      onSuccess();
      onClose();
      // Reset state
      setTitle("");
      setSelectedStoryIds([]);
      setStep("stories");
    } catch (error: any) {
      toast.error("Failed to create highlight", { description: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] p-0 overflow-hidden bg-background border-border/40">
        <DialogHeader className="px-4 py-3 border-b border-border/40 flex flex-row items-center justify-between space-y-0">
          <div className="flex items-center gap-3">
            {step === "details" && (
              <button onClick={() => setStep("stories")} className="p-1 -ml-1 hover:bg-secondary rounded-full">
                <ChevronLeft className="w-5 h-5" />
              </button>
            )}
            <DialogTitle className="text-base font-bold">
              {step === "stories" ? "New Highlight" : "Title"}
            </DialogTitle>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-primary font-bold h-auto p-0"
            onClick={step === "stories" ? () => setStep("details") : handleCreate}
            disabled={selectedStoryIds.length === 0 || (step === "details" && !title.trim()) || loading}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : (step === "stories" ? "Next" : "Done")}
          </Button>
        </DialogHeader>

        <div className="max-h-[70vh] overflow-y-auto">
          {step === "stories" ? (
            <div className="p-4 pt-2">
              <h3 className="text-[13px] font-bold text-muted-foreground mb-4 uppercase tracking-wider">Select Stories</h3>
              {isLoading ? (
                <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary opacity-50" /></div>
              ) : userStories.length === 0 ? (
                <div className="text-center py-20">
                  <p className="text-muted-foreground">You haven't posted any stories yet.</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-1">
                  {userStories.map((story) => (
                    <div 
                      key={story.id} 
                      className="aspect-[9/16] relative cursor-pointer group overflow-hidden bg-secondary"
                      onClick={() => toggleStory(story.id)}
                    >
                      <img src={story.media_url} alt="" className="w-full h-full object-cover" />
                      <div className={`absolute inset-0 transition-colors ${selectedStoryIds.includes(story.id) ? "bg-black/20" : "bg-transparent group-hover:bg-black/10"}`} />
                      <div className={`absolute top-2 right-2 w-6 h-6 rounded-full border-2 border-white flex items-center justify-center transition-all ${selectedStoryIds.includes(story.id) ? "bg-primary border-primary" : "bg-black/20"}`}>
                        {selectedStoryIds.includes(story.id) && <Check className="w-4 h-4 text-white" />}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="p-6 text-center">
              <div className="w-24 h-24 rounded-full border border-border mx-auto mb-6 p-1">
                <div className="w-full h-full rounded-full overflow-hidden bg-secondary">
                  <img 
                    src={userStories.find(s => s.id === selectedStoryIds[0])?.media_url} 
                    className="w-full h-full object-cover" 
                    alt="Cover preview"
                  />
                </div>
              </div>
              <Input 
                placeholder="Name your highlight" 
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="text-center bg-secondary/50 border-0 h-10 rounded-xl focus-visible:ring-1 focus-visible:ring-primary/20"
                maxLength={15}
                autoFocus
              />
              <p className="text-[11px] text-muted-foreground mt-4 italic">
                This highlight will be visible to everyone on your profile.
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
