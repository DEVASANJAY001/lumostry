import { useState, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import BottomNav from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { ArrowLeft, Plus, ImagePlus, Trash2, Loader2, Lock, Unlock } from "lucide-react";
import Lightbox from "@/components/Lightbox";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

export default function MyGalleryPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [pointsInput, setPointsInput] = useState(0);
  const [viewPhoto, setViewPhoto] = useState<string | null>(null);

  const { data: photos, isLoading } = useQuery({
    queryKey: ["my-gallery", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from("gallery_photos")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!user,
  });

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Max 5MB");
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${user.id}/gallery_${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("photos")
        .upload(path, file);
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("photos")
        .getPublicUrl(path);

      const { error } = await supabase.from("gallery_photos").insert({
        user_id: user.id,
        photo_url: publicUrl,
        points_required: pointsInput,
      });
      if (error) throw error;

      toast.success("Photo added to gallery!");
      queryClient.invalidateQueries({ queryKey: ["my-gallery"] });
      setPointsInput(0);
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const deleteMutation = useMutation({
    mutationFn: async (photoId: string) => {
      const { error } = await supabase
        .from("gallery_photos")
        .delete()
        .eq("id", photoId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-gallery"] });
      toast.success("Photo removed");
    },
  });

  return (
    <div className="min-h-screen pb-20">
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-1">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-heading font-bold text-gradient">My Gallery</h1>
      </div>

      <div className="p-5 space-y-6">
        {/* Upload Section */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl bg-card border border-border p-4"
        >
          <h3 className="font-heading font-semibold text-sm mb-3">Add Photo</h3>
          <div className="flex items-center gap-3 mb-3">
            <label className="text-sm text-muted-foreground">Points to unlock:</label>
            <input
              type="number"
              min={0}
              step={10}
              value={pointsInput}
              onChange={(e) => setPointsInput(Math.max(0, Number(e.target.value)))}
              className="w-24 px-3 py-1.5 rounded-lg bg-secondary border border-border text-sm text-foreground"
            />
            <span className="text-xs text-muted-foreground">(0 = free)</span>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleUpload}
          />
          <Button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="w-full rounded-xl gradient-primary text-primary-foreground"
          >
            {uploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ImagePlus className="w-4 h-4 mr-2" />}
            {uploading ? "Uploading..." : "Choose Photo"}
          </Button>
        </motion.div>

        {/* Gallery Grid */}
        <div className="grid grid-cols-2 gap-3">
          {photos?.map((photo: any, idx: number) => (
            <motion.div
              key={photo.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.03 }}
              className="relative rounded-2xl overflow-hidden aspect-square bg-secondary group"
            >
              <img src={photo.photo_url} alt="" className="w-full h-full object-cover cursor-pointer" onClick={() => setViewPhoto(photo.photo_url)} />
              <div className="absolute top-2 left-2">
                {photo.points_required > 0 ? (
                  <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-background/80 backdrop-blur text-xs font-medium text-primary">
                    <Lock className="w-3 h-3" /> {photo.points_required} pts
                  </span>
                ) : (
                  <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-background/80 backdrop-blur text-xs font-medium text-green-400">
                    <Unlock className="w-3 h-3" /> Free
                  </span>
                )}
              </div>
              <button
                onClick={() => deleteMutation.mutate(photo.id)}
                className="absolute top-2 right-2 w-8 h-8 rounded-full bg-destructive/80 backdrop-blur flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Trash2 className="w-3.5 h-3.5 text-destructive-foreground" />
              </button>
            </motion.div>
          ))}
        </div>

        {photos?.length === 0 && !isLoading && (
          <p className="text-sm text-muted-foreground text-center py-10">
            No photos yet. Add some to your gallery!
          </p>
        )}
      </div>

      <BottomNav />

      {viewPhoto && <Lightbox src={viewPhoto} onClose={() => setViewPhoto(null)} />}
    </div>
  );
}
