import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import ProfileCard from "@/components/ProfileCard";
import BottomNav from "@/components/BottomNav";
import PageTransition from "@/components/PageTransition";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Sparkles, Users, SlidersHorizontal, X, CheckCircle, Coins, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

type GenderFilter = "male" | "female" | "everyone";

const FILTER_OPTIONS: { value: GenderFilter; label: string; emoji: string }[] = [
  { value: "everyone", label: "Anyone", emoji: "🌍" },
  { value: "male", label: "Male", emoji: "👨" },
  { value: "female", label: "Female", emoji: "👩" },
];

const INTEREST_OPTIONS = [
  "Travel", "Music", "Fitness", "Gaming", "Movies", "Cooking",
  "Photography", "Reading", "Art", "Sports", "Dancing", "Nature",
];

const FREE_SWIPES_EVERYONE = 100;
const FREE_SWIPES_GENDER = 10;
const COST_PER_SWIPE = 1;

export default function SearchPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [genderFilter, setGenderFilter] = useState<GenderFilter>("everyone");
  const [showFilters, setShowFilters] = useState(false);
  const [ageRange, setAgeRange] = useState<[number, number]>([18, 50]);
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [swipeCount, setSwipeCount] = useState(0);
  const [searchSeed, setSearchSeed] = useState(0);

  // Initialize swipe count from localStorage
  useEffect(() => {
    if (!user) return;
    const key = `swipes_${user.id}`;
    const stored = localStorage.getItem(key);

    // Calculate logical day (resets at 5:00 AM)
    const now = new Date();
    const logicalDate = new Date(now.getTime() - 5 * 60 * 60 * 1000);
    const todayStr = logicalDate.toISOString().split("T")[0];

    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed.date === todayStr) {
          setSwipeCount(parsed.count);
        } else {
          // Reset for new logical day
          setSwipeCount(0);
          localStorage.setItem(key, JSON.stringify({ date: todayStr, count: 0 }));
        }
      } catch {
        setSwipeCount(0);
      }
    } else {
      localStorage.setItem(key, JSON.stringify({ date: todayStr, count: 0 }));
    }
  }, [user]);

  // Sync swipeCount to localStorage whenever it changes
  useEffect(() => {
    if (!user || swipeCount === 0) return; // Don't overwrite on initial mount sequence unnecessarily
    const key = `swipes_${user.id}`;
    const now = new Date();
    const logicalDate = new Date(now.getTime() - 5 * 60 * 60 * 1000);
    const todayStr = logicalDate.toISOString().split("T")[0];
    localStorage.setItem(key, JSON.stringify({ date: todayStr, count: swipeCount }));
  }, [swipeCount, user]);

  const freeLimit = genderFilter === "everyone" ? FREE_SWIPES_EVERYONE : FREE_SWIPES_GENDER;
  const remainingFree = Math.max(0, freeLimit - swipeCount);
  const isPaid = swipeCount >= freeLimit && genderFilter !== "everyone";

  // We intentionally do not reset the swipe count when filter changes anymore
  // because the free daily limit should be global across filters.
  // Wait, the prompt says "reset swipe count only at 5:00 AM every day".
  // So we remove the useEffect that resets on genderFilter change.

  const { data: wallet } = useQuery({
    queryKey: ["wallet", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase.from("wallets").select("*").eq("user_id", user.id).single();
      return data;
    },
    enabled: !!user,
  });

  const { data: profiles = [], isLoading, refetch } = useQuery({
    queryKey: ["search-profiles", user?.id, genderFilter, ageRange, verifiedOnly, selectedInterests, searchSeed],
    queryFn: async () => {
      if (!user) return [];

      const { data: likedData } = await supabase.from("likes").select("liked_id").eq("liker_id", user.id);
      const likedIds = (likedData || []).map((l) => l.liked_id);

      const { data: blockedData } = await supabase.from("blocked_users").select("blocked_id").eq("blocker_id", user.id);
      const blockedIds = (blockedData || []).map((b) => b.blocked_id);

      const { data: sentRequests } = await supabase.from("friend_requests").select("receiver_id").eq("sender_id", user.id);
      const sentIds = (sentRequests || []).map((r) => r.receiver_id);

      const excludeIds = [user.id, ...likedIds, ...blockedIds, ...sentIds];

      let query = supabase
        .from("profiles")
        .select("*")
        .eq("profile_complete", true)
        .not("avatar_url", "is", null)
        .not("user_id", "in", `(${excludeIds.join(",")})`)
        .gte("age", ageRange[0])
        .lte("age", ageRange[1])
        .limit(50);

      if (genderFilter !== "everyone") {
        query = query.eq("gender", genderFilter);
      }

      if (verifiedOnly) {
        query = query.eq("is_verified", true);
      }

      const { data, error } = await query;
      if (error) throw error;

      let results = [...(data || [])] as Profile[];

      if (selectedInterests.length > 0) {
        results = results.filter(p => p.interests?.some(i => selectedInterests.includes(i)));
      }

      return results.sort(() => Math.random() - 0.5);
    },
    enabled: !!user,
  });

  const handleFilterChange = (filter: GenderFilter) => {
    setGenderFilter(filter);
    setCurrentIndex(0);
  };

  const toggleInterest = (interest: string) => {
    setSelectedInterests(prev =>
      prev.includes(interest) ? prev.filter(i => i !== interest) : [...prev, interest]
    );
  };

  const activeFilterCount = (verifiedOnly ? 1 : 0) + selectedInterests.length +
    (ageRange[0] !== 18 || ageRange[1] !== 50 ? 1 : 0);

  const deductPoint = async () => {
    if (!user || !wallet) return false;
    if (wallet.balance < COST_PER_SWIPE) {
      toast.error("Not enough points!", { description: "Add points to your wallet to keep swiping." });
      return false;
    }
    const { error } = await supabase
      .from("wallets")
      .update({ balance: wallet.balance - COST_PER_SWIPE })
      .eq("user_id", user.id);
    if (error) {
      toast.error("Failed to deduct points");
      return false;
    }
    await supabase.from("transactions").insert({
      user_id: user.id,
      amount: -COST_PER_SWIPE,
      type: "swipe",
      description: `Swipe on ${genderFilter} filter`,
    });
    queryClient.invalidateQueries({ queryKey: ["wallet"] });
    return true;
  };

  const canSwipe = async () => {
    if (genderFilter === "everyone") {
      if (swipeCount >= FREE_SWIPES_EVERYONE) {
        toast("You've used all 100 free swipes!", { description: "Switch filters or check back later." });
        return false;
      }
      return true;
    }
    // Gender-specific filter
    if (swipeCount < FREE_SWIPES_GENDER) return true;
    // Past free limit — deduct point
    return await deductPoint();
  };

  const likeMutation = useMutation({
    mutationFn: async (likedId: string) => {
      const { error } = await supabase.from("likes").insert({ liker_id: user!.id, liked_id: likedId });
      if (error && error.code !== "23505") throw error;

      const { data: match } = await supabase
        .from("matches")
        .select("*")
        .or(`and(user1_id.eq.${user!.id},user2_id.eq.${likedId}),and(user1_id.eq.${likedId},user2_id.eq.${user!.id})`)
        .maybeSingle();

      if (match) {
        toast("🎉 It's a match!", { description: "You both liked each other!" });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["matches"] });
    },
  });

  const handleLike = async () => {
    if (!profiles[currentIndex]) return;
    const allowed = await canSwipe();
    if (!allowed) return;
    likeMutation.mutate(profiles[currentIndex].user_id);
    setSwipeCount((c) => c + 1);
    setCurrentIndex((i) => i + 1);
  };

  const handlePass = async () => {
    const allowed = await canSwipe();
    if (!allowed) return;
    setSwipeCount((c) => c + 1);
    setCurrentIndex((i) => i + 1);
  };

  const currentProfile = profiles[currentIndex];

  return (
    <PageTransition className="min-h-screen pb-20">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border px-4 py-3">
        <div className="flex items-center gap-3 mb-3">
          <button onClick={() => navigate(-1)} className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center transition-all active:scale-90 flex-shrink-0">
            <ArrowLeft className="w-4 h-4 text-foreground" />
          </button>
          <div className="flex items-center gap-2 flex-1">
            <Search className="w-5 h-5 text-primary hidden sm:block" />
            <h1 className="text-xl font-heading font-bold text-gradient">Search</h1>
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`relative w-9 h-9 rounded-full flex items-center justify-center transition-all ${showFilters ? "gradient-primary text-primary-foreground shadow-glow" : "bg-secondary text-muted-foreground"
              }`}
          >
            <SlidersHorizontal className="w-4 h-4" />
            {activeFilterCount > 0 && !showFilters && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full gradient-primary text-[9px] text-primary-foreground font-bold flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>

        {/* Gender Filter Tabs */}
        <div className="flex gap-2">
          {FILTER_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => handleFilterChange(opt.value)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-medium transition-all ${genderFilter === opt.value
                ? "gradient-primary text-primary-foreground shadow-glow"
                : "bg-secondary text-muted-foreground hover:text-foreground"
                }`}
            >
              <span>{opt.emoji}</span>
              <span>{opt.label}</span>
            </button>
          ))}
        </div>

        {/* Swipe counter badge */}
        <div className="mt-2 flex items-center justify-center gap-2">
          <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${isPaid ? "bg-amber-500/10 text-amber-600 dark:text-amber-400" : "bg-primary/10 text-primary"
            }`}>
            {isPaid ? (
              <>
                <Coins className="w-3 h-3" />
                <span>1 point per swipe · Balance: {wallet?.balance ?? 0}</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3 h-3" />
                <span>{remainingFree} free swipe{remainingFree !== 1 ? "s" : ""} left</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Advanced Filters Panel */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden border-b border-border bg-card/50"
          >
            <div className="p-4 space-y-5">
              {/* Age Range */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium">Age Range</label>
                  <span className="text-xs text-muted-foreground">{ageRange[0]} – {ageRange[1]}</span>
                </div>
                <div className="flex items-center gap-3">
                  <input type="range" min={18} max={50} value={ageRange[0]}
                    onChange={(e) => { const val = Number(e.target.value); setAgeRange([Math.min(val, ageRange[1] - 1), ageRange[1]]); }}
                    className="flex-1 accent-primary h-1" />
                  <input type="range" min={18} max={50} value={ageRange[1]}
                    onChange={(e) => { const val = Number(e.target.value); setAgeRange([ageRange[0], Math.max(val, ageRange[0] + 1)]); }}
                    className="flex-1 accent-primary h-1" />
                </div>
              </div>

              {/* Verified Only */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium">Verified profiles only</span>
                </div>
                <button
                  onClick={() => setVerifiedOnly(!verifiedOnly)}
                  className={`w-11 h-6 rounded-full transition-all relative ${verifiedOnly ? "gradient-primary" : "bg-secondary"}`}
                >
                  <motion.div
                    className="w-5 h-5 rounded-full bg-primary-foreground shadow-card absolute top-0.5"
                    animate={{ left: verifiedOnly ? 22 : 2 }}
                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                  />
                </button>
              </div>

              {/* Interests */}
              <div>
                <label className="text-sm font-medium mb-2 block">Filter by interests</label>
                <div className="flex flex-wrap gap-2">
                  {INTEREST_OPTIONS.map((interest) => {
                    const selected = selectedInterests.includes(interest);
                    return (
                      <button key={interest} onClick={() => toggleInterest(interest)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${selected ? "gradient-primary text-primary-foreground shadow-glow" : "bg-secondary text-muted-foreground hover:text-foreground"
                          }`}>
                        {interest}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Apply / Reset */}
              <div className="flex gap-2 pt-1">
                <button onClick={() => { setAgeRange([18, 50]); setVerifiedOnly(false); setSelectedInterests([]); setCurrentIndex(0); }}
                  className="flex-1 py-2.5 rounded-xl bg-secondary text-sm font-medium text-muted-foreground">Reset</button>
                <button onClick={() => { setCurrentIndex(0); setShowFilters(false); refetch(); }}
                  className="flex-1 py-2.5 rounded-xl gradient-primary text-primary-foreground text-sm font-medium shadow-glow">Apply Filters</button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="p-4 flex items-center justify-center min-h-[calc(100vh-14rem)]">
        {isLoading ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
            <Sparkles className="w-8 h-8 text-primary animate-spin mx-auto mb-3" />
            <p className="text-muted-foreground">Searching for people...</p>
          </motion.div>
        ) : currentProfile ? (
          <AnimatePresence mode="popLayout">
            <ProfileCard key={currentProfile.id} profile={currentProfile} onLike={handleLike} onPass={handlePass} />
          </AnimatePresence>
        ) : (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
            <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-heading font-semibold">No more profiles</h3>
            <p className="text-muted-foreground text-sm mt-1">
              {activeFilterCount > 0 ? "Try adjusting your filters" : "Check back later!"}
            </p>
            <button onClick={() => { setCurrentIndex(0); setSearchSeed(s => s + 1); }}
              className="mt-4 px-6 py-2 rounded-full gradient-primary text-primary-foreground text-sm font-medium shadow-glow">Refresh</button>
          </motion.div>
        )}
      </div>

      {currentProfile && (
        <div className="fixed bottom-20 left-0 right-0 flex justify-center pointer-events-none">
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 0.5 }} className="text-xs text-muted-foreground">
            ← Swipe left to skip · Swipe right to like →
          </motion.p>
        </div>
      )}

      <BottomNav />
    </PageTransition>
  );
}
