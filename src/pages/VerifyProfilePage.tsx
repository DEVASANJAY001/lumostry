import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useUpdateProfile, useProfile } from "@/hooks/useProfile";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { ArrowLeft, Camera, ShieldCheck, Sparkles } from "lucide-react";

export default function VerifyProfilePage() {
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const updateProfile = useUpdateProfile();
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      setFile(f);
      setPreview(URL.createObjectURL(f));
    }
  };

  const handleVerify = async () => {
    if (!file || !user) return;
    setUploading(true);

    try {
      const ext = file.name.split(".").pop();
      const path = `${user.id}/verification.${ext}`;
      const { error: uploadErr } = await supabase.storage
        .from("photos")
        .upload(path, file, { upsert: true });
      if (uploadErr) throw uploadErr;

      const { data: urlData } = supabase.storage.from("photos").getPublicUrl(path);

      await updateProfile.mutateAsync({
        verification_photo_url: urlData.publicUrl,
        is_verified: true,
      });

      toast.success("Profile verified! 🎉 You now have the verified badge.");
      navigate("/profile");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setUploading(false);
    }
  };

  if (profile?.is_verified) {
    return (
      <div className="min-h-screen flex flex-col">
        <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-heading font-bold">Verification</h1>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring" }}>
            <ShieldCheck className="w-20 h-20 text-primary mx-auto mb-4" />
          </motion.div>
          <h2 className="text-2xl font-heading font-bold">You're Verified! ✅</h2>
          <p className="text-muted-foreground mt-2 max-w-xs">
            Your profile has the verified badge. Other users can see you're a real person.
          </p>
          <Button onClick={() => navigate("/profile")} className="mt-6 gradient-primary text-primary-foreground rounded-full px-6">
            Back to Profile
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)}>
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-heading font-bold">Verify Your Profile</h1>
      </div>

      <div className="flex-1 p-6 space-y-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center">
          <div className="w-20 h-20 rounded-full gradient-primary mx-auto flex items-center justify-center shadow-glow mb-4">
            <ShieldCheck className="w-10 h-10 text-primary-foreground" />
          </div>
          <h2 className="text-xl font-heading font-bold">Prove You're Real</h2>
          <p className="text-muted-foreground text-sm mt-2 max-w-xs mx-auto">
            Take a selfie to verify your identity. This helps keep Connectly safe and fake-free! 🛡️
          </p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <div className="rounded-2xl border border-border bg-card p-4 space-y-4">
            <h3 className="font-heading font-semibold text-sm">How it works:</h3>
            <div className="space-y-3">
              {[
                { step: "1", text: "Take a clear selfie showing your face" },
                { step: "2", text: "We compare it with your profile photos" },
                { step: "3", text: "Get the verified badge on your profile" },
              ].map((item) => (
                <div key={item.step} className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-full gradient-primary flex items-center justify-center text-xs font-bold text-primary-foreground flex-shrink-0">
                    {item.step}
                  </div>
                  <p className="text-sm text-muted-foreground pt-1">{item.text}</p>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Upload area */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <label className="block cursor-pointer">
            <div className={`aspect-[4/3] rounded-2xl border-2 border-dashed ${preview ? "border-primary" : "border-primary/30"} overflow-hidden flex items-center justify-center bg-secondary hover:bg-secondary/80 transition-all`}>
              {preview ? (
                <img src={preview} alt="Verification" className="w-full h-full object-cover" />
              ) : (
                <div className="text-center p-6">
                  <Camera className="w-10 h-10 text-primary mx-auto mb-2" />
                  <p className="text-sm font-medium">Take or upload a selfie</p>
                  <p className="text-xs text-muted-foreground mt-1">Clear face photo required</p>
                </div>
              )}
            </div>
            <input type="file" accept="image/*" capture="user" onChange={handleFileChange} className="hidden" />
          </label>
        </motion.div>

        <Button
          onClick={handleVerify}
          disabled={!file || uploading}
          className="w-full h-12 rounded-xl gradient-primary text-primary-foreground shadow-glow"
        >
          {uploading ? (
            <Sparkles className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <ShieldCheck className="w-4 h-4 mr-2" /> Verify Me
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
