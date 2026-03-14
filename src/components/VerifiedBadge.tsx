import { motion } from "framer-motion";
import { CheckCircle, Shield, Star } from "lucide-react";

interface VerifiedBadgeProps {
  size?: "sm" | "md" | "lg";
  type?: "verified" | "premium" | "trusted";
  className?: string;
  verifiedUntil?: string | null;
}

const sizeMap = { sm: "w-4 h-4", md: "w-5 h-5", lg: "w-7 h-7" };
const containerSizeMap = { sm: "w-5 h-5", md: "w-6 h-6", lg: "w-8 h-8" };

export default function VerifiedBadge({ size = "md", type = "verified", className = "", verifiedUntil }: VerifiedBadgeProps) {
  const spring = { type: "spring" as const, stiffness: 300, damping: 15 };

  if (verifiedUntil && new Date(verifiedUntil) < new Date()) {
    return null; // Expired badge
  }

  const Icon = type === "verified" ? CheckCircle : type === "premium" ? Star : Shield;
  const bg = type === "verified" ? "gradient-primary shadow-glow" : type === "premium" ? "bg-accent" : "bg-success";
  const fill = type === "premium" ? { fill: "currentColor", strokeWidth: 0 } : { strokeWidth: 2.5 };
  const textColor = type === "verified" ? "text-primary-foreground" : type === "premium" ? "text-accent-foreground" : "text-success-foreground";

  return (
    <motion.div
      initial={{ scale: 0, rotate: -180 }}
      animate={{ scale: 1, rotate: 0 }}
      transition={spring}
      className={`${containerSizeMap[size]} rounded-full ${bg} flex items-center justify-center ${className}`}
    >
      <Icon className={`${sizeMap[size]} ${textColor}`} {...fill} />
    </motion.div>
  );
}
