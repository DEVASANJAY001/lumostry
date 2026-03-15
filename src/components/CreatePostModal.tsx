import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Upload, Image as ImageIcon, Video, Send, Loader2, Hash } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface CreatePostModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function CreatePostModal({ isOpen, onClose, onSuccess }: CreatePostModalProps) {
  const { user } = useAuth();
  const [caption, setCaption] = useState("");
  const [hashtags, setHashtags] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setPreview(URL.createObjectURL(selectedFile));
    }
  };

  const handleSubmit = async () => {
    if (!user || !file) return;
    setUploading(true);

    try {
      const ext = file.name.split(".").pop();
      const path = `${user.id}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("posts")
        .upload(path, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from("posts").getPublicUrl(path);
      const mediaUrl = urlData.publicUrl;
      const mediaType = file.type.startsWith("video") ? "video" : "image";

      const tagsArray = hashtags
        .split(/[ ,]+/)
        .filter(tag => tag)
        .map(tag => tag.replace(/^#/, ""));

      const { error: dbError } = await supabase.from("posts").insert({
        user_id: user.id,
        media_url: mediaUrl,
        media_type: mediaType,
        caption,
        hashtags: tagsArray
      });

      if (dbError) throw dbError;

      toast.success("Post shared successfully! ✨");
      onSuccess?.();
      setCaption("");
      setHashtags("");
      setFile(null);
      setPreview(null);
    } catch (error: any) {
      toast.error(error.message || "Failed to share post");
    } finally {
      setUploading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center p-0 sm:p-4">
        <motion.div 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        />
        
        <motion.div 
          initial={{ y: "100%" }} 
          animate={{ y: 0 }} 
          exit={{ y: "100%" }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="relative w-full max-w-lg bg-card rounded-t-[32px] sm:rounded-[32px] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border">
            <button onClick={onClose} className="p-2 rounded-full hover:bg-secondary">
              <X className="w-5 h-5" />
            </button>
            <h2 className="font-heading font-bold">New Post</h2>
            <Button 
              size="sm" 
              onClick={handleSubmit}
              disabled={!file || uploading}
              className="rounded-full gradient-primary text-primary-foreground h-9 px-4"
            >
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Share <Send className="w-3.5 h-3.5 ml-1.5" /></>}
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Media Upload Area */}
            <div 
              onClick={() => fileInputRef.current?.click()}
              className={`relative aspect-square rounded-2xl border-2 border-dashed transition-all flex flex-col items-center justify-center cursor-pointer overflow-hidden ${
                preview ? "border-primary/50" : "border-border hover:border-primary/30 hover:bg-primary/5"
              }`}
            >
              <input 
                ref={fileInputRef}
                type="file" 
                accept="image/*,video/*" 
                onChange={handleFileChange} 
                className="hidden" 
              />
              
              {preview ? (
                <>
                  {file?.type.startsWith("video") ? (
                    <video src={preview} className="w-full h-full object-cover" controls />
                  ) : (
                    <img src={preview} alt="Preview" className="w-full h-full object-cover" />
                  )}
                  <button 
                    onClick={(e) => { e.stopPropagation(); setFile(null); setPreview(null); }}
                    className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </>
              ) : (
                <div className="text-center space-y-2 p-10">
                  <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-2 text-primary">
                    <Upload className="w-6 h-6" />
                  </div>
                  <p className="font-semibold text-sm">Select photo or video</p>
                  <p className="text-xs text-muted-foreground">Tap to choose from gallery</p>
                  <div className="flex items-center justify-center gap-4 pt-4">
                    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                      <ImageIcon className="w-3.5 h-3.5" /> Photos
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                      <Video className="w-3.5 h-3.5" /> Videos
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Caption */}
            <div className="space-y-2">
              <label className="text-sm font-semibold">Caption</label>
              <Textarea 
                placeholder="Write a caption..." 
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                className="bg-secondary/50 border-0 rounded-2xl resize-none h-24 focus-visible:ring-1 focus-visible:ring-primary/40"
              />
            </div>

            {/* Hashtags */}
            <div className="space-y-2 pb-6">
              <label className="text-sm font-semibold flex items-center gap-1.5">
                <Hash className="w-4 h-4 text-primary" /> Hashtags
              </label>
              <Input 
                placeholder="e.g. travel, vibes, sunset" 
                value={hashtags}
                onChange={(e) => setHashtags(e.target.value)}
                className="bg-secondary/50 border-0 rounded-xl h-11 focus-visible:ring-1 focus-visible:ring-primary/40"
              />
              <p className="text-[10px] text-muted-foreground pl-1">Separate tags with spaces or commas</p>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
