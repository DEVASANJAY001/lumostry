import { motion, useMotionValue, useTransform, PanInfo, AnimatePresence } from "framer-motion";
import { Heart, X, Star, CheckCircle, MapPin } from "lucide-react";
import type { Profile } from "@/hooks/useProfile";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

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

  const handleButtonLike = () => {
    setExitDirection("right");
    onLike();
  };

  const handleButtonPass = () => {
    setExitDirection("left");
    onPass();
  };

  const handleButtonSuperLike = () => {
    setExitDirection("up");
    onSuperLike?.();
  };

  return (
    <motion.div
      className="absolute inset-x-0 mx-auto w-full max-w-[380px] aspect-[2.8/4.5] rounded-2xl overflow-hidden shadow-card touch-none select-none will-change-transform"
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
      {/* LIKE / NOPE / SUPER LIKE overlays */}
      <motion.div
        className="absolute top-8 left-6 z-30 px-5 py-2 rounded-lg border-[3px] border-green-400 rotate-[-20deg]"
        style={{ opacity: likeOpacity }}
      >
        <span className="text-green-400 font-black text-3xl tracking-wider">LIKE</span>
      </motion.div>
      <motion.div
        className="absolute top-8 right-6 z-30 px-5 py-2 rounded-lg border-[3px] border-destructive rotate-[20deg]"
        style={{ opacity: passOpacity }}
      >
        <span className="text-destructive font-black text-3xl tracking-wider">NOPE</span>
      </motion.div>
      <motion.div
        className="absolute top-1/3 left-1/2 -translate-x-1/2 z-30 px-5 py-2 rounded-lg border-[3px] border-blue-400"
        style={{ opacity: superLikeOpacity }}
      >
        <span className="text-blue-400 font-black text-2xl tracking-wider">SUPER LIKE</span>
      </motion.div>

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
              <div className="absolute top-2 left-3 right-3 flex gap-1 z-20">
                {allPhotos.map((_, i) => (
                  <div
                    key={i}
                    className={`h-[3px] flex-1 rounded-full transition-all ${
                      i === photoIndex ? "bg-primary-foreground" : "bg-primary-foreground/30"
                    }`}
                  />
                ))}
              </div>
            )}
            {/* Tap zones */}
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

      {/* Bottom gradient */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />

      {/* Info overlay */}
      <div
        className="absolute bottom-20 left-0 right-0 px-5 z-10 cursor-pointer"
        onClick={() => navigate(`/user/${profile.user_id}`)}
      >
        <div className="flex items-end gap-2">
          <h3 className="text-3xl font-bold text-white">
            {profile.name || profile.username}
          </h3>
          {profile.age && <span className="text-2xl text-white/80 font-light">{profile.age}</span>}
          {profile.is_verified && <CheckCircle className="w-6 h-6 text-blue-400 mb-1" />}
        </div>

        {profile.bio && (
          <p className="text-sm text-white/75 mt-1 line-clamp-2 leading-relaxed">{profile.bio}</p>
        )}

        {profile.interests && profile.interests.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2.5">
            {profile.interests.slice(0, 5).map((i) => (
              <span key={i} className="px-3 py-1 text-xs rounded-full bg-white/15 text-white/90 backdrop-blur-sm font-medium">
                {i}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="absolute bottom-4 left-0 right-0 flex items-center justify-center gap-5 z-20">
        <button
          onClick={handleButtonPass}
          className="w-[52px] h-[52px] rounded-full bg-card/90 backdrop-blur border-2 border-destructive/40 flex items-center justify-center hover:scale-110 transition-transform active:scale-90 shadow-lg"
        >
          <X className="w-7 h-7 text-destructive" strokeWidth={3} />
        </button>

        {onSuperLike && (
          <button
            onClick={handleButtonSuperLike}
            className="w-11 h-11 rounded-full bg-card/90 backdrop-blur border-2 border-blue-400/40 flex items-center justify-center hover:scale-110 transition-transform active:scale-90 shadow-lg"
          >
            <Star className="w-5 h-5 text-blue-400" fill="currentColor" />
          </button>
        )}

        <button
          onClick={handleButtonLike}
          className="w-[52px] h-[52px] rounded-full bg-card/90 backdrop-blur border-2 border-green-400/40 flex items-center justify-center hover:scale-110 transition-transform active:scale-90 shadow-lg"
        >
          <Heart className="w-7 h-7 text-green-400" fill="currentColor" strokeWidth={0} />
        </button>
      </div>
    </motion.div>
  );
}
