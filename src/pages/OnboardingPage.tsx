import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useUpdateProfile } from "@/hooks/useProfile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import DateOfBirthPicker from "@/components/DateOfBirthPicker";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, ArrowLeft, Sparkles, User, Heart, Star, CalendarIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { format, differenceInYears } from "date-fns";
import { cn } from "@/lib/utils";

const INTERESTS = [
  "Music", "Travel", "Gaming", "Fitness", "Photography",
  "Cooking", "Reading", "Movies", "Art", "Tech",
  "Nature", "Dancing", "Fashion", "Sports", "Yoga",
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

export default function OnboardingPage() {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    username: "",
    dateOfBirth: null as Date | null,
    bio: "",
    gender: "" as "male" | "female" | "non_binary" | "prefer_not_to_say" | "",
    preference: "" as "male" | "female" | "everyone" | "",
    interests: [] as string[],
  });
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const updateProfile = useUpdateProfile();
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) { setAvatarFile(file); setAvatarPreview(URL.createObjectURL(file)); }
  };

  const toggleInterest = (interest: string) => {
    setForm((f) => ({
      ...f,
      interests: f.interests.includes(interest) ? f.interests.filter((i) => i !== interest) : [...f.interests, interest],
    }));
  };

  const handleFinish = async () => {
    if (!user) return;
    try {
      let avatar_url: string | null = null;
      if (avatarFile) {
        const ext = avatarFile.name.split(".").pop();
        const path = `${user.id}/avatar.${ext}`;
        const { error: uploadErr } = await supabase.storage.from("avatars").upload(path, avatarFile, { upsert: true });
        if (uploadErr) throw uploadErr;
        const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
        avatar_url = urlData.publicUrl;
      }
      const age = form.dateOfBirth ? differenceInYears(new Date(), form.dateOfBirth) : null;
      if (age !== null && age < 18) { toast.error("You must be at least 18 years old"); return; }

      await updateProfile.mutateAsync({
        username: form.username, age, date_of_birth: form.dateOfBirth ? format(form.dateOfBirth, "yyyy-MM-dd") : null,
        bio: form.bio, gender: form.gender || null, preference: form.preference || null, interests: form.interests,
        avatar_url, profile_complete: true,
      });
      toast.success("Welcome to Lumos ✨");
      // Force navigation to discover after profile completion
      window.location.href = "/discover";
    } catch (err: any) { toast.error(err.message); }
  };

  const steps = [
    <motion.div key="step0" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }} className="space-y-6">
      <div className="text-center">
        <User className="w-7 h-7 text-primary mx-auto mb-2" />
        <h2 className="text-xl font-heading font-semibold">Your Profile</h2>
        <p className="text-muted-foreground text-sm">Let people know who you are</p>
      </div>
      <div className="flex flex-col items-center gap-4">
        <label className="relative cursor-pointer group">
          <div className="w-24 h-24 rounded-full border-2 border-dashed border-primary/40 flex items-center justify-center overflow-hidden bg-secondary group-hover:border-primary transition-colors">
            {avatarPreview ? (
              <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <div className="flex flex-col items-center"><span className="text-2xl">📸</span><span className="text-[10px] text-muted-foreground mt-0.5">Required</span></div>
            )}
          </div>
          <input type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
        </label>
        <Input placeholder="Choose a username" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} className="bg-secondary border-0 text-center h-11" />
        <div className="w-full">
          <label className="text-sm font-medium mb-1 block text-center">Date of Birth</label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className={cn("w-full justify-center bg-secondary border-0 h-11", !form.dateOfBirth && "text-muted-foreground")}>
                <CalendarIcon className="w-4 h-4 mr-2" />
                {form.dateOfBirth ? format(form.dateOfBirth, "PPP") : "Select your birthday"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="center">
              <Calendar mode="single" selected={form.dateOfBirth || undefined} onSelect={(date) => setForm({ ...form, dateOfBirth: date || null })}
                disabled={(date) => date > new Date() || date < new Date("1920-01-01")} defaultMonth={new Date(2000, 0)}
                captionLayout="dropdown-buttons" fromYear={1920} toYear={new Date().getFullYear() - 18} initialFocus className={cn("p-3 pointer-events-auto")} />
            </PopoverContent>
          </Popover>
          {form.dateOfBirth && differenceInYears(new Date(), form.dateOfBirth) < 18 && (
            <p className="text-xs text-destructive mt-1 text-center">You must be 18+</p>
          )}
          {form.dateOfBirth && differenceInYears(new Date(), form.dateOfBirth) >= 18 && (
            <p className="text-xs text-muted-foreground mt-1 text-center">Age: {differenceInYears(new Date(), form.dateOfBirth)} ✓</p>
          )}
        </div>
      </div>
    </motion.div>,

    <motion.div key="step1" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }} className="space-y-6">
      <div className="text-center">
        <Heart className="w-7 h-7 text-primary mx-auto mb-2" />
        <h2 className="text-xl font-heading font-semibold">About You</h2>
        <p className="text-muted-foreground text-sm">Help us find the right people</p>
      </div>
      <div>
        <p className="text-sm font-medium mb-3">I am</p>
        <div className="grid grid-cols-2 gap-2">
          {GENDERS.map((g) => (
            <button key={g.value} onClick={() => setForm({ ...form, gender: g.value })}
              className={`p-3 rounded-xl border text-sm font-medium transition-all ${
                form.gender === g.value ? "border-primary bg-primary/8 text-primary" : "border-border bg-secondary text-foreground hover:border-primary/40"
              }`}>
              <span className="mr-1">{g.icon}</span> {g.label}
            </button>
          ))}
        </div>
      </div>
      <div>
        <p className="text-sm font-medium mb-3">I want to meet</p>
        <div className="grid grid-cols-3 gap-2">
          {PREFERENCES.map((p) => (
            <button key={p.value} onClick={() => setForm({ ...form, preference: p.value })}
              className={`p-3 rounded-xl border text-sm font-medium transition-all ${
                form.preference === p.value ? "border-primary bg-primary/8 text-primary" : "border-border bg-secondary text-foreground hover:border-primary/40"
              }`}>
              <span className="mr-1">{p.icon}</span> {p.label}
            </button>
          ))}
        </div>
      </div>
    </motion.div>,

    <motion.div key="step2" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }} className="space-y-6">
      <div className="text-center">
        <Star className="w-7 h-7 text-primary mx-auto mb-2" />
        <h2 className="text-xl font-heading font-semibold">Express Yourself</h2>
        <p className="text-muted-foreground text-sm">Share what makes you unique</p>
      </div>
      <Textarea placeholder="Write a short bio..." value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })}
        className="bg-secondary border-0 resize-none h-24" maxLength={300} />
      <div>
        <p className="text-sm font-medium mb-3">Pick your interests</p>
        <div className="flex flex-wrap gap-2">
          {INTERESTS.map((interest) => (
            <button key={interest} onClick={() => toggleInterest(interest)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                form.interests.includes(interest)
                  ? "gradient-primary text-primary-foreground shadow-glow"
                  : "bg-secondary text-muted-foreground hover:text-foreground border border-border"
              }`}>
              {interest}
            </button>
          ))}
        </div>
      </div>
    </motion.div>,
  ];

  const dobAge = form.dateOfBirth ? differenceInYears(new Date(), form.dateOfBirth) : 0;
  const canNext =
    (step === 0 && form.username && form.dateOfBirth && dobAge >= 18 && avatarFile) ||
    (step === 1 && form.gender && form.preference) ||
    (step === 2 && form.interests.length >= 1);

  return (
    <div className="min-h-screen flex flex-col p-6 relative">
      <div className="absolute inset-0 bg-gradient-to-b from-primary/3 via-background to-background" />

      <div className="relative z-10 flex gap-2 mb-8">
        {[0, 1, 2].map((i) => (
          <div key={i} className={`h-1 flex-1 rounded-full transition-all ${i <= step ? "gradient-primary" : "bg-secondary"}`} />
        ))}
      </div>

      <div className="relative z-10 flex-1">
        <AnimatePresence mode="wait">{steps[step]}</AnimatePresence>
      </div>

      <div className="relative z-10 flex gap-3 mt-8">
        {step > 0 && (
          <Button variant="outline" onClick={() => setStep(step - 1)} className="flex-1 h-11 rounded-xl">
            <ArrowLeft className="w-4 h-4 mr-1" /> Back
          </Button>
        )}
        <Button onClick={() => (step < 2 ? setStep(step + 1) : handleFinish())} disabled={!canNext || updateProfile.isPending}
          className="flex-1 h-11 rounded-xl gradient-primary text-primary-foreground shadow-glow">
          {updateProfile.isPending ? <Sparkles className="w-4 h-4 animate-spin" /> :
            step < 2 ? <>Next <ArrowRight className="w-4 h-4 ml-1" /></> : <>Let's Go! <Sparkles className="w-4 h-4 ml-1" /></>}
        </Button>
      </div>
    </div>
  );
}
