import { motion, AnimatePresence } from "framer-motion";
import { Heart, MessageCircle, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { Profile } from "@/hooks/useProfile";

interface MatchPopupProps {
  isOpen: boolean;
  matchedProfile: Profile | null;
  myProfile: Profile | null;
  onClose: () => void;
}

// Simple confetti particle
function ConfettiParticle({ delay, color }: { delay: number; color: string }) {
  const x = Math.random() * 400 - 200;
  const startX = Math.random() * 300 - 150;
  return (
    <motion.div
      className="absolute top-1/3 left-1/2 w-2.5 h-2.5 rounded-full"
      style={{ backgroundColor: color }}
      initial={{ opacity: 1, x: startX, y: 0, scale: 1 }}
      animate={{
        opacity: [1, 1, 0],
        x: startX + x,
        y: [0, -200 - Math.random() * 150, 400],
        scale: [1, 1.2, 0.5],
        rotate: Math.random() * 720,
      }}
      transition={{ duration: 2, delay, ease: "easeOut" }}
    />
  );
}

const confettiColors = [
  "hsl(var(--primary))",
  "#f43f5e",
  "#8b5cf6",
  "#f59e0b",
  "#10b981",
  "#3b82f6",
  "#ec4899",
  "#06b6d4",
];

export default function MatchPopup({ isOpen, matchedProfile, myProfile, onClose }: MatchPopupProps) {
  const navigate = useNavigate();

  if (!matchedProfile || !myProfile) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background/95 backdrop-blur-2xl"
        >
          {/* Confetti */}
          {Array.from({ length: 40 }).map((_, i) => (
            <ConfettiParticle
              key={i}
              delay={i * 0.04}
              color={confettiColors[i % confettiColors.length]}
            />
          ))}

          {/* Close */}
          <button onClick={onClose} className="absolute top-4 right-4 p-2 text-muted-foreground">
            <X className="w-6 h-6" />
          </button>

          {/* Heart animation */}
          <motion.div
            initial={{ scale: 0, rotate: -20 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 200, damping: 12, delay: 0.2 }}
          >
            <Heart className="w-16 h-16 text-primary mb-2" fill="currentColor" />
          </motion.div>

          {/* Title */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-4xl font-heading font-black text-gradient mb-8"
          >
            It's a Match!
          </motion.h1>

          {/* Avatars */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5 }}
            className="flex items-center gap-6 mb-6"
          >
            <div className="w-28 h-28 rounded-full overflow-hidden border-4 border-primary shadow-glow">
              {myProfile.avatar_url ? (
                <img src={myProfile.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-secondary flex items-center justify-center text-4xl">😊</div>
              )}
            </div>
            <div className="w-28 h-28 rounded-full overflow-hidden border-4 border-primary shadow-glow">
              {matchedProfile.avatar_url ? (
                <img src={matchedProfile.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-secondary flex items-center justify-center text-4xl">😊</div>
              )}
            </div>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.65 }}
            className="text-muted-foreground text-sm mb-8 text-center px-8"
          >
            You and <span className="font-semibold text-foreground">{matchedProfile.name}</span> liked each other
          </motion.p>

          {/* Actions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="flex gap-4"
          >
            <button
              onClick={() => {
                onClose();
                navigate(`/chat/${matchedProfile.user_id}`);
              }}
              className="px-8 py-3 rounded-full gradient-primary text-primary-foreground font-semibold shadow-glow flex items-center gap-2"
            >
              <MessageCircle className="w-5 h-5" /> Send Message
            </button>
            <button
              onClick={onClose}
              className="px-8 py-3 rounded-full bg-secondary text-foreground font-semibold border border-border"
            >
              Keep Swiping
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
