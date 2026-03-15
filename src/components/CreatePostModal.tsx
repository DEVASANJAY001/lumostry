import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Upload, Image as ImageIcon, Video, Send, Loader2, Hash, PlusSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Search, Check } from "lucide-react";

interface CreatePostModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  initialMode?: "post" | "story" | "reel";
}

export default function CreatePostModal({ isOpen, onClose, onSuccess, initialMode = "post" }: CreatePostModalProps) {
  const { user } = useAuth();
  const [caption, setCaption] = useState("");
  const [hashtags, setHashtags] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [mode, setMode] = useState<"post" | "story" | "reel">(initialMode);
  const [uploading, setUploading] = useState(false);
  const [mentionSearch, setMentionSearch] = useState("");
  const [selectedMentions, setSelectedMentions] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: friends = [] } = useQuery({
    queryKey: ["friends-list", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data: matches } = await supabase
        .from("matches")
        .select("*")
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`);
      if (!matches || matches.length === 0) return [];
      const otherIds = matches.map(m => m.user1_id === user.id ? m.user2_id : m.user1_id);
      const { data: profiles } = await supabase.from("profiles").select("*").in("user_id", otherIds);
      return profiles || [];
    },
    enabled: isOpen && mode === "story",
  });

  const filteredFriends = friends.filter(f => 
    f.name?.toLowerCase().includes(mentionSearch.toLowerCase()) || 
    f.username?.toLowerCase().includes(mentionSearch.toLowerCase())
  );

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
      const storageBucket = mode === "story" ? "stories" : "posts";
      const path = `${user.id}/${Date.now()}.${ext}`;
      
      const { error: uploadError } = await supabase.storage
        .from(storageBucket)
        .upload(path, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from(storageBucket).getPublicUrl(path);
      const mediaUrl = urlData.publicUrl;

      if (mode === "story") {
        const { data: storyData, error: dbError } = await supabase.from("stories").insert({
          user_id: user.id,
          media_url: mediaUrl,
          caption: caption || null,
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        }).select().single();

        if (dbError) throw dbError;

        if (selectedMentions.length > 0 && storyData) {
          const mentionInserts = selectedMentions.map(mentionedId => ({
            story_id: storyData.id,
            user_id: mentionedId
          }));
          await supabase.from("story_mentions" as any).insert(mentionInserts);
        }
      } else {
        const tagsArray = hashtags
          .split(/[ ,]+/)
          .filter(tag => tag)
          .map(tag => tag.replace(/^#/, ""));

        const { error: dbError } = await supabase.from("posts").insert({
          user_id: user.id,
          media_url: mediaUrl,
          media_type: mode === "reel" ? "reel" : (file.type.startsWith("video") ? "video" : "image"),
          caption,
          hashtags: tagsArray
        });
        if (dbError) throw dbError;
      }

      toast.success(`${mode.charAt(0).toUpperCase() + mode.slice(1)} shared successfully! ✨`);
      onSuccess?.();
      setCaption("");
      setHashtags("");
      setFile(null);
      setPreview(null);
    } catch (error: any) {
      toast.error(error.message || `Failed to share ${mode}`);
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
            <h2 className="font-heading font-bold">New {mode.charAt(0).toUpperCase() + mode.slice(1)}</h2>
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

                  {/* Type Preview Indicator (Optional) */}
                  <div className="absolute top-4 left-4">
                     <div className="bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full text-[10px] font-bold text-white uppercase tracking-wider flex items-center gap-2 border border-white/10">
                        {mode === "reel" ? <Video className="w-3 h-3" /> : mode === "story" ? <PlusSquare className="w-3 h-3" /> : <ImageIcon className="w-3 h-3" />}
                        {mode}
                     </div>
                  </div>
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

            {/* Hashtags (Only for posts/reels) */}
            {mode !== "story" && (
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
            )}

            {/* Mentions for Stories */}
            {mode === "story" && (
              <div className="space-y-3 pb-6">
                <label className="text-sm font-semibold flex items-center gap-1.5">
                  <Hash className="w-4 h-4 text-primary" /> Tag Friends
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input 
                    placeholder="Search people..." 
                    value={mentionSearch}
                    onChange={(e) => setMentionSearch(e.target.value)}
                    className="pl-10 bg-secondary/50 border-0 rounded-xl h-11"
                  />
                </div>
                
                {selectedMentions.length > 0 && (
                   <div className="flex flex-wrap gap-2 py-1">
                      {friends.filter(f => selectedMentions.includes(f.user_id)).map(friend => (
                        <div key={friend.user_id} className="bg-primary/10 text-primary text-[10px] font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5 border border-primary/20">
                           @{friend.username}
                           <button onClick={() => setSelectedMentions(prev => prev.filter(id => id !== friend.user_id))}>
                              <X className="w-3 h-3" />
                           </button>
                        </div>
                      ))}
                   </div>
                )}

                <div className="max-h-40 overflow-y-auto space-y-1 bg-secondary/10 rounded-2xl p-2 border border-border/20">
                  {filteredFriends.length === 0 ? (
                    <p className="text-[10px] text-muted-foreground text-center py-4">No friends found</p>
                  ) : filteredFriends.map((friend) => (
                    <button
                      key={friend.id}
                      onClick={() => {
                        setSelectedMentions(prev => 
                          prev.includes(friend.user_id) ? prev.filter(id => id !== friend.user_id) : [...prev, friend.user_id]
                        );
                      }}
                      className={`w-full flex items-center gap-3 p-2 rounded-xl transition-colors ${
                        selectedMentions.includes(friend.user_id) ? "bg-primary/5" : "hover:bg-secondary/50"
                      }`}
                    >
                      <Avatar className="w-8 h-8">
                        <AvatarImage src={friend.avatar_url} />
                        <AvatarFallback>{friend.name?.[0]}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 text-left">
                        <p className="text-xs font-bold leading-tight">{friend.name || friend.username}</p>
                        <p className="text-[10px] text-muted-foreground">@{friend.username}</p>
                      </div>
                      {selectedMentions.includes(friend.user_id) && (
                        <div className="bg-primary rounded-full p-1">
                          <Check className="w-2 h-2 text-white stroke-[3px]" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
