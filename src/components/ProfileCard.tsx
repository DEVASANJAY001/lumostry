import { motion } from "framer-motion";
import { Heart, X, UserPlus } from "lucide-react";
import type { Profile } from "@/hooks/useProfile";

interface ProfileCardProps {
  profile: Profile;
  onLike: () => void;
  onPass: () => void;
  onFriendRequest?: () => void;
}

export default function ProfileCard({ profile, onLike, onPass, onFriendRequest }: ProfileCardProps) {
  return (
    <motion.div
      className="relative w-full aspect-[3/4] rounded-3xl overflow-hidden shadow-card"
      initial={{ scale: 0.95, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.95, opacity: 0, x: 300 }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
    >
      {/* Photo */}
      <div className="absolute inset-0 bg-secondary">
        {profile.avatar_url ? (
          <img
            src={profile.avatar_url}
            alt={profile.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-6xl">
            {profile.gender === "female" ? "👩" : profile.gender === "male" ? "👨" : "🧑"}
          </div>
        )}
      </div>

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />

      {/* Info */}
      <div className="absolute bottom-0 left-0 right-0 p-5 pb-24">
        <h3 className="text-2xl font-heading font-bold">
          {profile.name || profile.username}
          {profile.age && <span className="text-lg font-normal text-muted-foreground ml-2">{profile.age}</span>}
        </h3>
        {profile.bio && (
          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{profile.bio}</p>
        )}
        {profile.interests && profile.interests.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {profile.interests.slice(0, 4).map((i) => (
              <span key={i} className="px-2.5 py-0.5 text-xs rounded-full bg-primary/20 text-primary font-medium">
                {i}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="absolute bottom-5 left-0 right-0 flex items-center justify-center gap-4">
        <button
          onClick={onPass}
          className="w-14 h-14 rounded-full bg-card border border-border flex items-center justify-center hover:bg-destructive/10 hover:border-destructive transition-all active:scale-90"
        >
          <X className="w-6 h-6 text-destructive" />
        </button>

        {onFriendRequest && (
          <button
            onClick={onFriendRequest}
            className="w-12 h-12 rounded-full bg-card border border-border flex items-center justify-center hover:bg-accent/10 hover:border-accent transition-all active:scale-90"
          >
            <UserPlus className="w-5 h-5 text-accent" />
          </button>
        )}

        <button
          onClick={onLike}
          className="w-14 h-14 rounded-full gradient-primary flex items-center justify-center shadow-glow hover:scale-105 transition-transform active:scale-90"
        >
          <Heart className="w-6 h-6 text-primary-foreground" fill="currentColor" />
        </button>
      </div>
    </motion.div>
  );
}
