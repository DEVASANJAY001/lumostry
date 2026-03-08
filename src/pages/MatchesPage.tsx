import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import BottomNav from "@/components/BottomNav";
import PageTransition from "@/components/PageTransition";
import WhoLikedMeTab from "@/components/WhoLikedMeTab";
import { motion } from "framer-motion";
import { Heart, MessageCircle, Eye } from "lucide-react";
import type { Profile } from "@/hooks/useProfile";

type Tab = "matches" | "liked-me";

export default function MatchesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>("matches");

  const { data: matchedProfiles = [], isLoading } = useQuery({
    queryKey: ["matches", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data: matches } = await supabase.from("matches").select("*")
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`).order("created_at", { ascending: false });
      if (!matches || matches.length === 0) return [];
      const otherIds = matches.map((m) => m.user1_id === user.id ? m.user2_id : m.user1_id);
      const { data: profiles } = await supabase.from("profiles").select("*").in("user_id", otherIds);
      return (profiles || []) as Profile[];
    },
    enabled: !!user,
  });

  const { data: likerCount = 0 } = useQuery({
    queryKey: ["liker-count", user?.id],
    queryFn: async () => {
      if (!user) return 0;
      const { count } = await supabase.from("likes").select("*", { count: "exact", head: true }).eq("liked_id", user.id);
      return count || 0;
    },
    enabled: !!user,
  });

  return (
    <PageTransition className="min-h-screen pb-20">
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border px-5 py-3">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab("matches")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
              activeTab === "matches"
                ? "gradient-primary text-primary-foreground shadow-glow"
                : "bg-secondary text-muted-foreground"
            }`}
          >
            <Heart className="w-4 h-4" />
            <span>Matches</span>
          </button>
          <button
            onClick={() => setActiveTab("liked-me")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-medium transition-all relative ${
              activeTab === "liked-me"
                ? "gradient-primary text-primary-foreground shadow-glow"
                : "bg-secondary text-muted-foreground"
            }`}
          >
            <Eye className="w-4 h-4" />
            <span>Who Liked Me</span>
            {likerCount > 0 && activeTab !== "liked-me" && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full gradient-primary text-[10px] text-primary-foreground font-bold flex items-center justify-center shadow-glow">
                {likerCount > 99 ? "99+" : likerCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {activeTab === "matches" ? (
        <>
          {isLoading ? (
            <div className="text-center py-20">
              <Heart className="w-7 h-7 text-primary animate-pulse mx-auto" />
            </div>
          ) : matchedProfiles.length === 0 ? (
            <div className="text-center py-20 px-8">
              <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mx-auto mb-4">
                <Heart className="w-7 h-7 text-muted-foreground" />
              </div>
              <h3 className="text-base font-heading font-semibold">No matches yet</h3>
              <p className="text-muted-foreground text-sm mt-1">Keep swiping to find your match!</p>
            </div>
          ) : (
            <div className="p-4">
              <div className="mb-6">
                <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-1 mb-3">New Matches</h2>
                <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                  {matchedProfiles.map((profile, i) => (
                    <motion.button
                      key={profile.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.04 }}
                      onClick={() => navigate(`/chat/${profile.user_id}`)}
                      className="flex-shrink-0 flex flex-col items-center gap-1.5"
                    >
                      <div className="w-16 h-16 rounded-full overflow-hidden bg-secondary ring-2 ring-primary/30 ring-offset-2 ring-offset-background">
                        {profile.avatar_url ? (
                          <img src={profile.avatar_url} alt={profile.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xl">
                            {profile.gender === "female" ? "👩" : "👨"}
                          </div>
                        )}
                      </div>
                      <span className="text-[11px] font-medium truncate w-16 text-center">{profile.name?.split(" ")[0]}</span>
                    </motion.button>
                  ))}
                </div>
              </div>

              <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-1 mb-3">All Matches</h2>
              <div className="space-y-0.5">
                {matchedProfiles.map((profile, i) => (
                  <motion.button
                    key={profile.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.02 }}
                    onClick={() => navigate(`/chat/${profile.user_id}`)}
                    className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-secondary/30 transition-colors text-left active:bg-secondary/50"
                  >
                    <div className="relative">
                      <div className="w-12 h-12 rounded-full overflow-hidden bg-secondary">
                        {profile.avatar_url ? (
                          <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-lg">
                            {profile.gender === "female" ? "👩" : "👨"}
                          </div>
                        )}
                      </div>
                      {profile.is_online && (
                        <div className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-success border-2 border-background" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-sm">
                        {profile.name || profile.username}
                        {profile.age && <span className="font-normal text-muted-foreground ml-1">{profile.age}</span>}
                      </h3>
                      <p className="text-[11px] text-muted-foreground mt-0.5">Tap to start chatting</p>
                    </div>
                    <MessageCircle className="w-4 h-4 text-muted-foreground" />
                  </motion.button>
                ))}
              </div>
            </div>
          )}
        </>
      ) : (
        <WhoLikedMeTab />
      )}

      <BottomNav />
    </PageTransition>
  );
}
