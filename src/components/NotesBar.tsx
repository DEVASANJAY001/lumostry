import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, X, Send, Loader2, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

interface Note {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  profiles: {
    name: string;
    username: string;
    avatar_url: string | null;
  };
  likes_count: number;
  is_liked: boolean;
}


export default function NotesBar() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [noteContent, setNoteContent] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: notes = [], isLoading } = useQuery({
    queryKey: ["notes", user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data: following } = await (supabase
        .from("followers" as any)
        .select("following_id")
        .eq("follower_id", user.id) as any);
      
      const ids = [user.id, ...(following || []).map((f: any) => f.following_id)];

      const { data, error } = await supabase
        .from("notes" as any)
        .select(`
          *,
          profiles(name, username, avatar_url),
          note_likes(user_id)
        `)
        .in("user_id", ids)
        .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      return (data as any[]).map(note => ({
        ...note,
        likes_count: note.note_likes?.length || 0,
        is_liked: note.note_likes?.some((l: any) => l.user_id === user.id) || false
      })) as Note[];
    },
    enabled: !!user,
  });

  const toggleLikeMutation = useMutation({
    mutationFn: async ({ noteId, isLiked }: { noteId: string, isLiked: boolean }) => {
      if (!user) return;
      if (isLiked) {
        await supabase.from("note_likes" as any).delete().eq("note_id", noteId).eq("user_id", user.id);
      } else {
        await supabase.from("note_likes" as any).insert({ note_id: noteId, user_id: user.id });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notes"] });
    },
  });

  const postNoteMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!user) return;
      await supabase.from("notes" as any).delete().eq("user_id", user.id);
      const { error } = await supabase
        .from("notes" as any)
        .insert({ user_id: user.id, content });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notes"] });
      setIsAddingNote(false);
      setNoteContent("");
      toast.success("Note shared! 💭");
    },
  });

  const myNote = notes.find(n => n.user_id === user?.id);
  const othersNotes = notes.filter(n => n.user_id !== user?.id);

  return (
    <div className="relative">
      <div 
        ref={scrollRef}
        className="flex items-center gap-4 p-4 overflow-x-auto scrollbar-hide bg-background"
      >
        {/* Your Note */}
        <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
          <div className="relative">
            <button 
              onClick={() => setIsAddingNote(true)}
              className="w-16 h-16 rounded-full overflow-hidden bg-secondary relative group"
            >
              <div className="w-full h-full flex items-center justify-center text-xl bg-gradient-to-br from-primary/10 to-accent/10 text-primary/40">
                <MessageSquare className="w-6 h-6" />
              </div>
              
              <div className="absolute -top-1 -right-1 w-full flex justify-center pointer-events-none">
                <AnimatePresence>
                  {myNote ? (
                    <motion.div 
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="bg-card border border-border rounded-2xl px-2 py-1 shadow-xl max-w-[80px]"
                    >
                      <p className="text-[10px] truncate leading-tight text-center">{myNote.content}</p>
                    </motion.div>
                  ) : (
                    <motion.div 
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="bg-accent w-5 h-5 rounded-full flex items-center justify-center shadow-lg pointer-events-auto"
                    >
                      <Plus className="w-3 h-3 text-accent-foreground" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </button>
          </div>
          <span className="text-[10px] text-muted-foreground font-medium">Your note</span>
        </div>

        {/* Friend Notes */}
        {othersNotes.map((note) => (
          <div key={note.id} className="flex flex-col items-center gap-1.5 flex-shrink-0">
            <div className="relative">
              <Avatar className="w-16 h-16 border-2 border-background ring-2 ring-border/50">
                <AvatarImage src={note.profiles?.avatar_url || ""} />
                <AvatarFallback>{note.profiles?.name?.[0]}</AvatarFallback>
              </Avatar>
                <button 
                  onClick={() => toggleLikeMutation.mutate({ noteId: note.id, isLiked: note.is_liked })}
                  className={`bg-card border border-border rounded-2xl px-2.5 py-1.5 shadow-xl max-w-[90px] relative group overflow-hidden tap-scale-sm ${note.is_liked ? "border-primary/30" : ""}`}
                >
                  <p className="text-[10px] line-clamp-2 leading-tight text-center font-medium">
                    {note.content}
                  </p>
                  {note.likes_count > 0 && (
                    <div className="absolute -bottom-1 -right-1">
                      <div className="bg-primary text-white p-0.5 rounded-full shadow-glow">
                        <Plus className={`w-2 h-2 ${note.is_liked ? "fill-current" : ""}`} />
                      </div>
                    </div>
                  )}
                  <AnimatePresence>
                    {note.is_liked && (
                      <motion.div
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        className="absolute inset-0 bg-primary/5 pointer-events-none"
                      />
                    )}
                  </AnimatePresence>
                </button>
            </div>
            <span className="text-[10px] text-muted-foreground font-medium truncate w-16 text-center">
              {note.profiles?.username || note.profiles?.name}
            </span>
          </div>
        ))}

        {isLoading && (
          <div className="flex gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="w-16 h-16 rounded-full bg-secondary animate-pulse flex-shrink-0" />
            ))}
          </div>
        )}
      </div>

      {/* Add Note Modal */}
      <AnimatePresence>
        {isAddingNote && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAddingNote(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-sm bg-card rounded-[32px] p-6 shadow-2xl border border-border"
            >
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="w-20 h-20 rounded-full bg-secondary overflow-hidden mb-2 relative">
                  {user?.user_metadata?.avatar_url ? (
                    <img src={user.user_metadata.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-2xl">👤</div>
                  )}
                  {/* Thought bubble indicator */}
                  <div className="absolute -top-2 -right-2 bg-primary text-primary-foreground p-1.5 rounded-full">
                    <MessageSquare className="w-4 h-4" />
                  </div>
                </div>
                
                <h2 className="text-xl font-heading font-bold">Share a thought</h2>
                <p className="text-xs text-muted-foreground">
                  Notes are visible for 24 hours to your followers.
                </p>

                <div className="w-full relative">
                  <textarea 
                    autoFocus
                    value={noteContent}
                    onChange={(e) => setNoteContent(e.target.value.slice(0, 60))}
                    placeholder="What's on your mind?"
                    className="w-full bg-secondary/50 border-0 rounded-2xl p-4 text-center resize-none h-24 focus:ring-1 focus:ring-primary/40 text-sm"
                  />
                  <div className="absolute bottom-2 right-4 text-[10px] text-muted-foreground">
                    {noteContent.length}/60
                  </div>
                </div>

                <div className="flex gap-3 w-full">
                  <Button 
                    variant="secondary" 
                    className="flex-1 rounded-full"
                    onClick={() => setIsAddingNote(false)}
                  >
                    Cancel
                  </Button>
                  <Button 
                    disabled={!noteContent.trim() || postNoteMutation.isPending}
                    onClick={() => postNoteMutation.mutate(noteContent)}
                    className="flex-1 rounded-full gradient-primary text-primary-foreground shadow-glow"
                  >
                    {postNoteMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Share"}
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
