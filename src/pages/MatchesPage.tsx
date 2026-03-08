import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import BottomNav from "@/components/BottomNav";
import { motion } from "framer-motion";
import { Heart, MessageCircle } from "lucide-react";
import type { Profile } from "@/hooks/useProfile";

export default function MatchesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: matchedProfiles = [], isLoading } = useQuery({
    queryKey: ["matches", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data: matches } = await supabase
        .from("matches")
        .select("*")
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
        .order("created_at", { ascending: false });
      if (!matches || matches.length === 0) return [];
      const otherIds = matches.map((m) =>
        m.user1_id === user.id ? m.user2_id : m.user1_id
      );
      const { data: profiles } = await supabase
        .from("profiles")
        .select("*")
        .in("user_id", otherIds);
      return (profiles || []) as Profile[];
    },
    enabled: !!user,
  });

  // Split into new matches (no messages) and existing
  const { data: newMatches = [], data: messageMatches = [] } = useQuery({
    queryKey: ["matches-split", user?.id, matchedProfiles],
    queryFn: async () => {
      return matchedProfiles; // just return all for now
    },
    enabled: matchedProfiles.length > 0,
  });

  return (
    <div className="min-h-screen pb-20 bg-background">
      <div className="sticky top-0 z-40 bg-background px-5 py-3">
        <h1 className="text-2xl font-heading font-bold text-primary">Matches</h1>
      </div>

      {isLoading ? (
        <div className="text-center py-20">
          <Heart className="w-10 h-10 text-primary animate-pulse mx-auto" />
        </div>
      ) : matchedProfiles.length === 0 ? (
        <div className="text-center py-20 px-8">
          <div className="w-24 h-24 rounded-full bg-secondary flex items-center justify-center mx-auto mb-5">
            <Heart className="w-12 h-12 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-heading font-bold">No matches yet</h3>
          <p className="text-muted-foreground text-sm mt-2 leading-relaxed">
            Start swiping to find your match!
          </p>
        </div>
      ) : (
        <div className="px-4">
          {/* New Matches - Horizontal scroll */}
          <div className="mb-6">
            <h2 className="text-sm font-semibold text-primary px-1 mb-3">New Matches</h2>
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
              {matchedProfiles.map((profile, i) => (
                <motion.button
                  key={profile.id}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.05 }}
                  onClick={() => navigate(`/chat/${profile.user_id}`)}
                  className="flex-shrink-0 flex flex-col items-center gap-1.5"
                >
                  <div className="relative">
                    <div className="w-[72px] h-[72px] rounded-full overflow-hidden bg-secondary ring-2 ring-primary ring-offset-2 ring-offset-background">
                      {profile.avatar_url ? (
                        <img src={profile.avatar_url} alt={profile.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-2xl">
                          {profile.gender === "female" ? "👩" : "👨"}
                        </div>
                      )}
                    </div>
                    {profile.is_online && (
                      <div className="absolute bottom-0.5 right-0.5 w-3.5 h-3.5 rounded-full bg-green-500 border-2 border-background" />
                    )}
                  </div>
                  <span className="text-xs font-medium truncate w-[72px] text-center">
                    {profile.name?.split(" ")[0] || profile.username}
                  </span>
                </motion.button>
              ))}
            </div>
          </div>

          {/* Messages section */}
          <div>
            <h2 className="text-sm font-semibold text-foreground px-1 mb-3">Messages</h2>
            <div className="space-y-1">
              {matchedProfiles.map((profile, i) => (
                <motion.button
                  key={profile.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03 }}
                  onClick={() => navigate(`/chat/${profile.user_id}`)}
                  className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-secondary/50 transition-colors text-left"
                >
                  <div className="relative">
                    <div className="w-14 h-14 rounded-full overflow-hidden bg-secondary flex-shrink-0">
                      {profile.avatar_url ? (
                        <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xl">
                          {profile.gender === "female" ? "👩" : "👨"}
                        </div>
                      )}
                    </div>
                    {profile.is_online && (
                      <div className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-green-500 border-2 border-background" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm">
                      {profile.name || profile.username}
                      {profile.age && <span className="font-normal text-muted-foreground ml-1">{profile.age}</span>}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">Say hello! 👋</p>
                  </div>
                  <MessageCircle className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                </motion.button>
              ))}
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}
