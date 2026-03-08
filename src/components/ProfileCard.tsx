import { motion, useMotionValue, useTransform, PanInfo } from "framer-motion";
import { Heart, X, UserPlus, CheckCircle } from "lucide-react";
import type { Profile } from "@/hooks/useProfile";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

interface ProfileCardProps {
  profile: Profile;
  onLike: () => void;
  onPass: () => void;
  onFriendRequest?: () => void;
  swipeable?: boolean;
}

export default function ProfileCard({ profile, onLike, onPass, onFriendRequest, swipeable }: ProfileCardProps) {
  const navigate = useNavigate();
  const [photoIndex, setPhotoIndex] = useState(0);
  const [swiping, setSwiping] = useState(false);

  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-15, 15]);
  const likeOpacity = useTransform(x, [0, 100], [0, 1]);
  const passOpacity = useTransform(x, [-100, 0], [1, 0]);

  const allPhotos = [
    ...(profile.avatar_url ? [profile.avatar_url] : []),
    ...(profile.photos || []),
  ];

  const handleDragEnd = (_: any, info: PanInfo) => {
    const threshold = 100;
    if (info.offset.x > threshold) {
      setSwiping(true);
      onLike();
    } else if (info.offset.x < -threshold) {
      setSwiping(true);
      onPass();
    }
  };

  return (
    <motion.div
      className="relative w-full aspect-[3/4] rounded-3xl overflow-hidden shadow-card touch-none"
      style={swipeable ? { x, rotate } : {}}
      drag={swipeable ? "x" : false}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.8}
      onDragEnd={handleDragEnd}
      initial={{ scale: 0.95, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.95, opacity: 0, x: swiping ? 300 : -300 }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
    >
      {/* Swipe indicators */}
      {swipeable && (
        <>
          <motion.div
            className="absolute top-6 left-6 z-30 px-4 py-2 rounded-xl border-2 border-green-500 bg-green-500/20"
            style={{ opacity: likeOpacity }}
          >
            <span className="text-green-500 font-bold text-lg">LIKE 💕</span>
          </motion.div>
          <motion.div
            className="absolute top-6 right-6 z-30 px-4 py-2 rounded-xl border-2 border-destructive bg-destructive/20"
            style={{ opacity: passOpacity }}
          >
            <span className="text-destructive font-bold text-lg">SKIP ✋</span>
          </motion.div>
        </>
      )}

      {/* Photo */}
      <div className="absolute inset-0 bg-secondary">
        {allPhotos.length > 0 ? (
          <>
            <img
              src={allPhotos[photoIndex]}
              alt={profile.name}
              className="w-full h-full object-cover"
              draggable={false}
            />
            {/* Photo indicators */}
            {allPhotos.length > 1 && (
              <div className="absolute top-3 left-3 right-3 flex gap-1 z-10">
                {allPhotos.map((_, i) => (
                  <div
                    key={i}
                    className={`h-0.5 flex-1 rounded-full transition-all ${
                      i === photoIndex ? "bg-primary-foreground" : "bg-primary-foreground/30"
                    }`}
                  />
                ))}
              </div>
            )}
            {/* Tap zones for photos */}
            <div className="absolute inset-0 flex z-10" style={{ bottom: "120px" }}>
              <div className="flex-1" onClick={() => setPhotoIndex(Math.max(0, photoIndex - 1))} />
              <div className="flex-1" onClick={() => setPhotoIndex(Math.min(allPhotos.length - 1, photoIndex + 1))} />
            </div>
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-6xl">
            {profile.gender === "female" ? "👩" : profile.gender === "male" ? "👨" : "🧑"}
          </div>
        )}
      </div>

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />

      {/* Info */}
      <div
        className="absolute bottom-0 left-0 right-0 p-5 pb-24 cursor-pointer"
        onClick={() => navigate(`/user/${profile.user_id}`)}
      >
        <div className="flex items-center gap-2">
          <h3 className="text-2xl font-heading font-bold">
            {profile.name || profile.username}
          </h3>
          {profile.age && <span className="text-lg text-muted-foreground">{profile.age}</span>}
          {profile.is_verified && <CheckCircle className="w-5 h-5 text-primary" />}
        </div>
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
      <div className="absolute bottom-5 left-0 right-0 flex items-center justify-center gap-4 z-20">
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
