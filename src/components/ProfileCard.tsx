import { motion, useMotionValue, useTransform, PanInfo } from "framer-motion";
import { Heart, X, Star, CheckCircle } from "lucide-react";
import type { Profile } from "@/hooks/useProfile";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import VerifiedBadge from "@/components/VerifiedBadge";

interface ProfileCardProps {
  profile: Profile;
  onLike: () => void;
  onPass: () => void;
  onSuperLike?: () => void;
}

export default function ProfileCard({ profile, onLike, onPass, onSuperLike }: ProfileCardProps) {
  const navigate = useNavigate();
  const [photoIndex, setPhotoIndex] = useState(0);
  const [exitDirection, setExitDirection] = useState<"left" | "right" | "up" | null>(null);

  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotate = useTransform(x, [-300, 300], [-25, 25]);
  const likeOpacity = useTransform(x, [0, 100], [0, 1]);
  const passOpacity = useTransform(x, [-100, 0], [1, 0]);
  const superLikeOpacity = useTransform(y, [-100, 0], [1, 0]);

  const allPhotos = [
    ...(profile.avatar_url ? [profile.avatar_url] : []),
    ...(profile.photos || []),
  ];

  const handleDragEnd = (_: any, info: PanInfo) => {
    if (info.offset.x > 120) {
      setExitDirection("right");
      onLike();
    } else if (info.offset.x < -120) {
      setExitDirection("left");
      onPass();
    } else if (info.offset.y < -100 && onSuperLike) {
      setExitDirection("up");
      onSuperLike();
    }
  };

  const handleButtonLike = () => { setExitDirection("right"); onLike(); };
  const handleButtonPass = () => { setExitDirection("left"); onPass(); };
  const handleButtonSuperLike = () => { setExitDirection("up"); onSuperLike?.(); };

  return (
    <motion.div
      className="absolute inset-x-0 mx-auto w-full max-w-[380px] aspect-[2.8/4.5] rounded-3xl overflow-hidden shadow-elevated touch-none select-none will-change-transform"
      style={{ x, y, rotate }}
      drag
      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
      dragElastic={0.9}
      onDragEnd={handleDragEnd}
      initial={{ scale: 0.95, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{
        x: exitDirection === "right" ? 500 : exitDirection === "left" ? -500 : 0,
        y: exitDirection === "up" ? -600 : 0,
        opacity: 0,
        transition: { duration: 0.35, ease: "easeIn" },
      }}
      transition={{ type: "spring", stiffness: 260, damping: 24 }}
    >
      {/* Overlays */}
      <motion.div
        className="absolute top-8 left-6 z-30 px-5 py-2 rounded-xl border-[3px] border-success rotate-[-20deg] bg-success/10 backdrop-blur-sm"
        style={{ opacity: likeOpacity }}
      >
        <span className="text-success font-black text-3xl tracking-wider">LIKE</span>
      </motion.div>
      <motion.div
        className="absolute top-8 right-6 z-30 px-5 py-2 rounded-xl border-[3px] border-destructive rotate-[20deg] bg-destructive/10 backdrop-blur-sm"
        style={{ opacity: passOpacity }}
      >
        <span className="text-destructive font-black text-3xl tracking-wider">NOPE</span>
      </motion.div>
      <motion.div
        className="absolute top-1/3 left-1/2 -translate-x-1/2 z-30 px-5 py-2 rounded-xl border-[3px] border-accent bg-accent/10 backdrop-blur-sm"
        style={{ opacity: superLikeOpacity }}
      >
        <span className="text-accent font-black text-2xl tracking-wider">SUPER LIKE</span>
      </motion.div>

      {/* Photo */}
      <div className="absolute inset-0 bg-secondary">
        {allPhotos.length > 0 ? (
          <>
            <motion.img
              key={photoIndex}
              src={allPhotos[photoIndex]}
              alt={profile.name}
              className="w-full h-full object-cover"
              draggable={false}
              initial={{ opacity: 0.8 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.2 }}
            />
            {allPhotos.length > 1 && (
              <div className="absolute top-3 left-4 right-4 flex gap-1 z-20">
                {allPhotos.map((_, i) => (
                  <div
                    key={i}
                    className={`h-[3px] flex-1 rounded-full transition-all duration-300 ${
                      i === photoIndex ? "bg-primary-foreground shadow-glow" : "bg-primary-foreground/25"
                    }`}
                  />
                ))}
              </div>
            )}
            <div className="absolute inset-0 flex z-10" style={{ bottom: "160px" }}>
              <div className="flex-1" onClick={() => setPhotoIndex(Math.max(0, photoIndex - 1))} />
              <div className="flex-1" onClick={() => setPhotoIndex(Math.min(allPhotos.length - 1, photoIndex + 1))} />
            </div>
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-7xl bg-gradient-to-br from-secondary to-muted">
            {profile.gender === "female" ? "👩" : profile.gender === "male" ? "👨" : "🧑"}
          </div>
        )}
      </div>

      {/* Bottom gradient - enhanced with glassmorphism */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent pointer-events-none" />

      {/* Info overlay with glass effect */}
      <div
        className="absolute bottom-20 left-0 right-0 px-5 z-10 cursor-pointer"
        onClick={() => navigate(`/user/${profile.user_id}`)}
      >
        <div className="flex items-end gap-2">
          <h3 className="text-3xl font-bold text-primary-foreground drop-shadow-lg">
            {profile.name || profile.username}
          </h3>
          {profile.age && <span className="text-2xl text-primary-foreground/80 font-light">{profile.age}</span>}
          {profile.is_verified && <VerifiedBadge size="sm" className="mb-1" />}
        </div>

        {profile.bio && (
          <p className="text-sm text-primary-foreground/70 mt-1.5 line-clamp-2 leading-relaxed">{profile.bio}</p>
        )}

        {profile.interests && profile.interests.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {profile.interests.slice(0, 5).map((i) => (
              <span key={i} className="px-3 py-1 text-xs rounded-full bg-primary-foreground/15 text-primary-foreground/90 backdrop-blur-md font-medium border border-primary-foreground/10">
                {i}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Action buttons - premium glass style */}
      <div className="absolute bottom-4 left-0 right-0 flex items-center justify-center gap-5 z-20">
        <motion.button
          onClick={handleButtonPass}
          whileHover={{ scale: 1.12 }}
          whileTap={{ scale: 0.88 }}
          className="w-[54px] h-[54px] rounded-full bg-card/80 backdrop-blur-xl border-2 border-destructive/30 flex items-center justify-center shadow-elevated"
        >
          <X className="w-7 h-7 text-destructive" strokeWidth={3} />
        </motion.button>

        {onSuperLike && (
          <motion.button
            onClick={handleButtonSuperLike}
            whileHover={{ scale: 1.12 }}
            whileTap={{ scale: 0.88 }}
            className="w-11 h-11 rounded-full bg-card/80 backdrop-blur-xl border-2 border-accent/30 flex items-center justify-center shadow-elevated"
          >
            <Star className="w-5 h-5 text-accent" fill="currentColor" />
          </motion.button>
        )}

        <motion.button
          onClick={handleButtonLike}
          whileHover={{ scale: 1.12 }}
          whileTap={{ scale: 0.88 }}
          className="w-[54px] h-[54px] rounded-full gradient-primary border-2 border-primary-foreground/10 flex items-center justify-center shadow-glow"
        >
          <Heart className="w-7 h-7 text-primary-foreground" fill="currentColor" strokeWidth={0} />
        </motion.button>
      </div>
    </motion.div>
  );
}
