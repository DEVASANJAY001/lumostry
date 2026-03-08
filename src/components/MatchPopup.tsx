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

function ConfettiParticle({ delay, color }: { delay: number; color: string }) {
  const x = Math.random() * 400 - 200;
  const startX = Math.random() * 300 - 150;
  return (
    <motion.div
      className="absolute top-1/3 left-1/2 w-2 h-2 rounded-full"
      style={{ backgroundColor: color }}
      initial={{ opacity: 1, x: startX, y: 0, scale: 1 }}
      animate={{
        opacity: [1, 1, 0],
        x: startX + x,
        y: [0, -200 - Math.random() * 150, 400],
        scale: [1, 1.3, 0.4],
        rotate: Math.random() * 720,
      }}
      transition={{ duration: 2.2, delay, ease: "easeOut" }}
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
          transition={{ duration: 0.4 }}
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background/95 backdrop-blur-3xl"
        >
          {/* Confetti */}
          {Array.from({ length: 50 }).map((_, i) => (
            <ConfettiParticle key={i} delay={i * 0.03} color={confettiColors[i % confettiColors.length]} />
          ))}

          {/* Close */}
          <motion.button
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            className="absolute top-5 right-5 w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-muted-foreground"
          >
            <X className="w-5 h-5" />
          </motion.button>

          {/* Heart */}
          <motion.div
            initial={{ scale: 0, rotate: -30 }}
            animate={{ scale: [0, 1.3, 1], rotate: 0 }}
            transition={{ duration: 0.6, ease: [0.34, 1.56, 0.64, 1], delay: 0.15 }}
          >
            <Heart className="w-16 h-16 text-primary mb-3" fill="currentColor" />
          </motion.div>

          {/* Title */}
          <motion.h1
            initial={{ opacity: 0, y: 25 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
            className="text-4xl font-heading font-black text-gradient mb-8"
          >
            It's a Match!
          </motion.h1>

          {/* Avatars */}
          <motion.div
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5, type: "spring", stiffness: 200, damping: 18 }}
            className="flex items-center gap-5 mb-6"
          >
            <motion.div
              initial={{ x: -30, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.55, duration: 0.4 }}
              className="w-28 h-28 rounded-full overflow-hidden border-[3px] border-primary shadow-glow"
            >
              {myProfile.avatar_url ? (
                <img src={myProfile.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-secondary flex items-center justify-center text-4xl">😊</div>
              )}
            </motion.div>
            <motion.div
              initial={{ x: 30, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.6, duration: 0.4 }}
              className="w-28 h-28 rounded-full overflow-hidden border-[3px] border-primary shadow-glow"
            >
              {matchedProfile.avatar_url ? (
                <img src={matchedProfile.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-secondary flex items-center justify-center text-4xl">😊</div>
              )}
            </motion.div>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
            className="text-muted-foreground text-sm mb-10 text-center px-8"
          >
            You and <span className="font-semibold text-foreground">{matchedProfile.name}</span> liked each other
          </motion.p>

          {/* Actions */}
          <motion.div
            initial={{ opacity: 0, y: 25 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.85, duration: 0.4 }}
            className="flex flex-col gap-3 w-full px-10"
          >
            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={() => { onClose(); navigate(`/chat/${matchedProfile.user_id}`); }}
              className="w-full py-3.5 rounded-2xl gradient-primary text-primary-foreground font-semibold shadow-glow flex items-center justify-center gap-2 text-sm"
            >
              <MessageCircle className="w-5 h-5" /> Send a Message
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={onClose}
              className="w-full py-3.5 rounded-2xl bg-secondary text-foreground font-medium text-sm"
            >
              Keep Swiping
            </motion.button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
