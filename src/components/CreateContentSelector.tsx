import { motion, AnimatePresence } from "framer-motion";
import { X, Grid, PlusSquare, PlaySquare, Image, Camera, Film } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";

interface CreateContentSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (type: "post" | "story" | "reel") => void;
}

export default function CreateContentSelector({ isOpen, onClose, onSelect }: CreateContentSelectorProps) {
  const options = [
    {
      id: "post",
      title: "Post",
      description: "Share a photo or video to your feed",
      icon: Grid,
      color: "bg-blue-500",
      gradient: "from-blue-500 to-cyan-400"
    },
    {
      id: "story",
      title: "Story",
      description: "Add a temporary photo or video",
      icon: PlusSquare,
      color: "bg-fuchsia-500",
      gradient: "from-fuchsia-600 to-purple-500"
    },
    {
      id: "reel",
      title: "Reel",
      description: "Create a short video with effects",
      icon: PlaySquare,
      color: "bg-orange-500",
      gradient: "from-orange-500 to-rose-500"
    }
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[340px] rounded-t-[32px] sm:rounded-[32px] p-0 border-0 bg-background overflow-hidden bottom-0 sm:bottom-auto fixed sm:relative">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-heading font-bold">Create</h2>
            <button onClick={onClose} className="p-2 hover:bg-secondary rounded-full transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-3 pb-2">
            {options.map((opt) => (
              <motion.button
                key={opt.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onSelect(opt.id as any)}
                className="w-full flex items-center gap-4 p-4 rounded-2xl bg-secondary/40 hover:bg-secondary/60 transition-colors group text-left border border-border/5"
              >
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${opt.gradient} flex items-center justify-center text-white shadow-lg group-hover:shadow-glow transition-shadow`}>
                  <opt.icon className="w-6 h-6" />
                </div>
                <div className="flex flex-col">
                  <span className="font-bold text-sm tracking-tight">{opt.title}</span>
                  <span className="text-[11px] text-muted-foreground leading-tight">{opt.description}</span>
                </div>
              </motion.button>
            ))}
          </div>

          <div className="mt-6 pt-4 border-t border-border/40 flex flex-col items-center">
             <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest font-bold text-muted-foreground mb-4">
                <div className="w-8 h-[1px] bg-border/40" />
                <span>Quick Access</span>
                <div className="w-8 h-[1px] bg-border/40" />
             </div>
             <div className="flex gap-6">
                <button className="flex flex-col items-center gap-1 opacity-60 hover:opacity-100 transition-opacity">
                   <div className="w-10 h-10 rounded-full border border-border flex items-center justify-center">
                      <Camera className="w-4 h-4" />
                   </div>
                   <span className="text-[9px] font-bold">Camera</span>
                </button>
                <button className="flex flex-col items-center gap-1 opacity-60 hover:opacity-100 transition-opacity">
                   <div className="w-10 h-10 rounded-full border border-border flex items-center justify-center">
                      <Image className="w-4 h-4" />
                   </div>
                   <span className="text-[9px] font-bold">Library</span>
                </button>
                <button className="flex flex-col items-center gap-1 opacity-60 hover:opacity-100 transition-opacity">
                   <div className="w-10 h-10 rounded-full border border-border flex items-center justify-center">
                      <Film className="w-4 h-4" />
                   </div>
                   <span className="text-[9px] font-bold">Drafts</span>
                </button>
             </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
