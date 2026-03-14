import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useProfile, useUpdateProfile } from "@/hooks/useProfile";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import DateOfBirthPicker from "@/components/DateOfBirthPicker";
import { toast } from "sonner";
import { motion } from "framer-motion";
import BottomNav from "@/components/BottomNav";
import {
  ArrowLeft, Camera, Plus, X, Upload, Save,
} from "lucide-react";
import { format, differenceInYears } from "date-fns";
import { cn } from "@/lib/utils";


const INTERESTS = [
  "Music", "Travel", "Gaming", "Fitness", "Photography",
  "Cooking", "Reading", "Movies", "Art", "Tech",
  "Nature", "Dancing", "Fashion", "Sports", "Yoga",
  "Pets", "Coffee", "Wine", "Hiking", "Meditation",
];

const GENDERS = [
  { value: "male" as const, label: "Male", icon: "👨" },
  { value: "female" as const, label: "Female", icon: "👩" },
  { value: "non_binary" as const, label: "Non-binary", icon: "🌈" },
  { value: "prefer_not_to_say" as const, label: "Prefer not to say", icon: "🤫" },
];

const PREFERENCES = [
  { value: "male" as const, label: "Men", icon: "👨" },
  { value: "female" as const, label: "Women", icon: "👩" },
  { value: "everyone" as const, label: "Everyone", icon: "💜" },
];

export default function EditProfilePage() {
  const { data: profile } = useProfile();
  const { user } = useAuth();
  const updateProfile = useUpdateProfile();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState(() => ({
    name: profile?.name || "",
    username: profile?.username || "",
    dateOfBirth: profile?.date_of_birth ? new Date(profile.date_of_birth) : null as Date | null,
    bio: profile?.bio || "",
    gender: profile?.gender || ("" as typeof profile.gender | ""),
    preference: profile?.preference || ("" as typeof profile.preference | ""),
    interests: profile?.interests || [],
  }));
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(profile?.avatar_url || null);
  const [photos, setPhotos] = useState<string[]>(profile?.photos || []);
  const [uploading, setUploading] = useState(false);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const handleAddPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (photos.length >= 6) {
      toast.error("Maximum 6 photos allowed");
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${user.id}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("photos").upload(path, file);
      if (error) throw error;
      const { data: urlData } = supabase.storage.from("photos").getPublicUrl(path);
      setPhotos((prev) => [...prev, urlData.publicUrl]);
      toast.success("Photo added! 📸");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setUploading(false);
    }
  };

  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const toggleInterest = (interest: string) => {
    setForm((f) => ({
      ...f,
      interests: f.interests.includes(interest)
        ? f.interests.filter((i) => i !== interest)
        : [...f.interests, interest],
    }));
  };

  const handleSave = async () => {
    if (!user) return;
    setUploading(true);

    try {
      let avatar_url = profile?.avatar_url || null;
      if (avatarFile) {
        const ext = avatarFile.name.split(".").pop();
        const path = `${user.id}/avatar.${ext}`;
        const { error: uploadErr } = await supabase.storage
          .from("avatars")
          .upload(path, avatarFile, { upsert: true });
        if (uploadErr) throw uploadErr;
        const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
        avatar_url = urlData.publicUrl;
      }

      const age = form.dateOfBirth ? differenceInYears(new Date(), form.dateOfBirth) : null;
      if (age !== null && age < 18) {
        toast.error("You must be at least 18 years old");
        return;
      }

      await updateProfile.mutateAsync({
        name: form.name,
        username: form.username,
        age,
        date_of_birth: form.dateOfBirth ? format(form.dateOfBirth, "yyyy-MM-dd") : null,
        bio: form.bio,
        ...(profile?.gender ? {} : { gender: form.gender || null }),
        preference: form.preference || null,
        interests: form.interests,
        avatar_url,
        photos,
        profile_complete: true,
      });

      toast.success("Profile saved! ✨");
      navigate("/profile");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)}>
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-heading font-bold flex-1">Edit Profile</h1>
        <Button
          onClick={handleSave}
          disabled={uploading}
          size="sm"
          className="gradient-primary text-primary-foreground rounded-full px-4"
        >
          <Save className="w-4 h-4 mr-1" /> Save
        </Button>
      </div>

      <div className="p-4 space-y-6">
        {/* Avatar */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center">
          <label className="relative cursor-pointer group">
            <div className="w-32 h-32 rounded-full overflow-hidden bg-secondary ring-4 ring-primary/20 group-hover:ring-primary/40 transition-all">
              {avatarPreview ? (
                <img src={avatarPreview} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-5xl">📸</div>
              )}
            </div>
            <div className="absolute bottom-1 right-1 w-8 h-8 rounded-full gradient-primary flex items-center justify-center shadow-glow">
              <Camera className="w-4 h-4 text-primary-foreground" />
            </div>
            <input type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
          </label>
          <p className="text-xs text-muted-foreground mt-2">Tap to change profile photo</p>
        </motion.div>

        {/* Photo Gallery */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <h3 className="font-heading font-semibold mb-3 flex items-center gap-2">
            📷 Photo Gallery
            <span className="text-xs text-muted-foreground font-normal">({photos.length}/6)</span>
          </h3>
          <div className="grid grid-cols-3 gap-2">
            {photos.map((url, i) => (
              <div key={i} className="relative aspect-square rounded-xl overflow-hidden bg-secondary">
                <img src={url} alt="" className="w-full h-full object-cover" />
                <button
                  onClick={() => removePhoto(i)}
                  className="absolute top-1 right-1 w-6 h-6 rounded-full bg-destructive/80 flex items-center justify-center"
                >
                  <X className="w-3 h-3 text-destructive-foreground" />
                </button>
              </div>
            ))}
            {photos.length < 6 && (
              <label className="relative aspect-square rounded-xl border-2 border-dashed border-primary/30 flex flex-col items-center justify-center cursor-pointer hover:border-primary/60 hover:bg-primary/5 transition-all">
                {uploading ? (
                  <Upload className="w-5 h-5 text-primary animate-bounce" />
                ) : (
                  <>
                    <Plus className="w-6 h-6 text-primary" />
                    <span className="text-[10px] text-muted-foreground mt-1">Add Photo</span>
                  </>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAddPhoto}
                  className="hidden"
                  disabled={uploading}
                />
              </label>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Add at least 1 photo to appear in discovery. Real photos only — no fakes! 🚫
          </p>
        </motion.div>

        {/* Name & Username */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="space-y-3">
          <div>
            <label className="text-sm font-medium mb-1 block">Name</label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="bg-secondary border-border"
              placeholder="Your name"
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Username</label>
            <Input
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              className="bg-secondary border-border"
              placeholder="@username"
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Date of Birth</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start bg-secondary border-border",
                    !form.dateOfBirth && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="w-4 h-4 mr-2" />
                  {form.dateOfBirth
                    ? format(form.dateOfBirth, "PPP")
                    : "Select your birthday"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={form.dateOfBirth || undefined}
                  onSelect={(date) => setForm({ ...form, dateOfBirth: date || null })}
                  disabled={(date) =>
                    date > new Date() || date < new Date("1920-01-01")
                  }
                  defaultMonth={form.dateOfBirth || new Date(2000, 0)}
                  captionLayout="dropdown-buttons"
                  fromYear={1920}
                  toYear={new Date().getFullYear() - 18}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
            {form.dateOfBirth && (
              <p className={cn(
                "text-xs mt-1",
                differenceInYears(new Date(), form.dateOfBirth) < 18 ? "text-destructive" : "text-muted-foreground"
              )}>
                Age: {differenceInYears(new Date(), form.dateOfBirth)}
                {differenceInYears(new Date(), form.dateOfBirth) >= 18 ? " ✓" : " — Must be 18+"}
              </p>
            )}
          </div>
        </motion.div>

        {/* Bio */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <label className="text-sm font-medium mb-1 block">Bio</label>
          <Textarea
            value={form.bio}
            onChange={(e) => setForm({ ...form, bio: e.target.value })}
            className="bg-secondary border-border resize-none h-24"
            placeholder="Tell people about yourself..."
            maxLength={300}
          />
          <p className="text-xs text-muted-foreground mt-1 text-right">{form.bio.length}/300</p>
        </motion.div>

        {/* Gender - locked after first selection */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <div className="flex items-center gap-2 mb-2">
            <label className="text-sm font-medium">I am</label>
            {profile?.gender && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground flex items-center gap-1">
                🔒 Locked
              </span>
            )}
          </div>
          {profile?.gender ? (
            <div className="p-3 rounded-xl border border-primary bg-primary/10 text-primary text-sm font-medium">
              <span className="mr-1">{GENDERS.find(g => g.value === profile.gender)?.icon}</span>
              {GENDERS.find(g => g.value === profile.gender)?.label}
              <p className="text-[10px] text-muted-foreground mt-1 font-normal">Gender cannot be changed after selection for safety reasons.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {GENDERS.map((g) => (
                <button
                  key={g.value}
                  onClick={() => setForm({ ...form, gender: g.value })}
                  className={`p-3 rounded-xl border text-sm font-medium transition-all ${
                    form.gender === g.value
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-secondary text-foreground hover:border-primary/50"
                  }`}
                >
                  <span className="mr-1">{g.icon}</span> {g.label}
                </button>
              ))}
            </div>
          )}
        </motion.div>

        {/* Preference */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          <label className="text-sm font-medium mb-2 block">I want to meet</label>
          <div className="grid grid-cols-3 gap-2">
            {PREFERENCES.map((p) => (
              <button
                key={p.value}
                onClick={() => setForm({ ...form, preference: p.value })}
                className={`p-3 rounded-xl border text-sm font-medium transition-all ${
                  form.preference === p.value
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-secondary text-foreground hover:border-primary/50"
                }`}
              >
                <span className="mr-1">{p.icon}</span> {p.label}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Interests */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <label className="text-sm font-medium mb-2 block">Interests</label>
          <div className="flex flex-wrap gap-2">
            {INTERESTS.map((interest) => (
              <button
                key={interest}
                onClick={() => toggleInterest(interest)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                  form.interests.includes(interest)
                    ? "gradient-primary text-primary-foreground"
                    : "bg-secondary text-muted-foreground hover:text-foreground border border-border"
                }`}
              >
                {interest}
              </button>
            ))}
          </div>
        </motion.div>
      </div>

      <BottomNav />
    </div>
  );
}
