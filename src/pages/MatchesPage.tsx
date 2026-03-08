import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import BottomNav from "@/components/BottomNav";
import { motion } from "framer-motion";
import { Heart } from "lucide-react";
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

  return (
    <div className="min-h-screen pb-20">
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border px-4 py-3">
        <h1 className="text-xl font-heading font-bold text-gradient">Matches</h1>
      </div>

      <div className="p-4">
        {isLoading ? (
          <div className="text-center py-16">
            <Heart className="w-8 h-8 text-primary animate-pulse mx-auto" />
          </div>
        ) : matchedProfiles.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-4">💫</div>
            <h3 className="text-lg font-heading font-semibold">No matches yet</h3>
            <p className="text-muted-foreground text-sm mt-1">Keep discovering to find your match!</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {matchedProfiles.map((profile, i) => (
              <motion.button
                key={profile.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => navigate(`/chat/${profile.user_id}`)}
                className="relative aspect-[3/4] rounded-2xl overflow-hidden group"
              >
                <div className="absolute inset-0 bg-secondary">
                  {profile.avatar_url ? (
                    <img src={profile.avatar_url} alt={profile.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-4xl">
                      {profile.gender === "female" ? "👩" : profile.gender === "male" ? "👨" : "🧑"}
                    </div>
                  )}
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
                <div className="absolute bottom-3 left-3 right-3">
                  <p className="font-heading font-semibold text-sm truncate">
                    {profile.name || profile.username}
                    {profile.age && <span className="text-muted-foreground ml-1">{profile.age}</span>}
                  </p>
                </div>
                <div className="absolute inset-0 bg-primary/10 opacity-0 group-hover:opacity-100 transition-opacity" />
              </motion.button>
            ))}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
