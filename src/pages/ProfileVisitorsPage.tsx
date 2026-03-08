import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import BottomNav from "@/components/BottomNav";
import PageTransition from "@/components/PageTransition";
import { motion } from "framer-motion";
import { Eye, ArrowLeft, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { Profile } from "@/hooks/useProfile";

interface Visitor {
  id: string;
  visitor_user_id: string;
  visited_at: string;
  profile: Profile;
}

export default function ProfileVisitorsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: visitors = [], isLoading } = useQuery({
    queryKey: ["profile-visitors", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from("profile_visitors" as any)
        .select("*")
        .eq("profile_user_id", user.id)
        .order("visited_at", { ascending: false })
        .limit(50);

      if (!data || data.length === 0) return [];

      const visitorIds = (data as any[]).map((v: any) => v.visitor_user_id);
      const { data: profiles } = await supabase.from("profiles").select("*").in("user_id", visitorIds);
      const profileMap = new Map((profiles || []).map((p) => [p.user_id, p as Profile]));

      return (data as any[])
        .map((v: any) => ({
          id: v.id,
          visitor_user_id: v.visitor_user_id,
          visited_at: v.visited_at,
          profile: profileMap.get(v.visitor_user_id),
        }))
        .filter((v: any) => v.profile) as Visitor[];
    },
    enabled: !!user,
  });

  return (
    <PageTransition className="min-h-screen pb-20">
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border px-4 py-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-heading font-bold text-gradient">Profile Visitors</h1>
            <p className="text-xs text-muted-foreground">{visitors.length} recent visitors</p>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="p-4 space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-16 rounded-xl bg-secondary animate-pulse" />
          ))}
        </div>
      ) : visitors.length === 0 ? (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center pt-20 px-8">
          <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mx-auto mb-4">
            <Eye className="w-7 h-7 text-muted-foreground" />
          </div>
          <h3 className="text-base font-heading font-semibold">No visitors yet</h3>
          <p className="text-muted-foreground text-sm mt-1">Complete your profile to attract more visitors!</p>
        </motion.div>
      ) : (
        <div className="p-4 space-y-1">
          {visitors.map((visitor, i) => (
            <motion.button
              key={visitor.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.03 }}
              onClick={() => navigate(`/user/${visitor.visitor_user_id}`)}
              className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-secondary/30 transition-colors text-left active:bg-secondary/50"
            >
              <div className="w-12 h-12 rounded-full overflow-hidden bg-secondary">
                {visitor.profile.avatar_url ? (
                  <img src={visitor.profile.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-lg">
                    {visitor.profile.gender === "female" ? "👩" : "👨"}
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-sm">
                  {visitor.profile.name}
                  {visitor.profile.age && <span className="font-normal text-muted-foreground ml-1">{visitor.profile.age}</span>}
                </h3>
                <div className="flex items-center gap-1 text-[11px] text-muted-foreground mt-0.5">
                  <Clock className="w-3 h-3" />
                  <span>{formatDistanceToNow(new Date(visitor.visited_at), { addSuffix: true })}</span>
                </div>
              </div>
              <Eye className="w-4 h-4 text-muted-foreground" />
            </motion.button>
          ))}
        </div>
      )}

      <BottomNav />
    </PageTransition>
  );
}
