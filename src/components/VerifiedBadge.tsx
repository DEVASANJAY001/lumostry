import { motion } from "framer-motion";
import { Check, Shield, Star } from "lucide-react";

interface VerifiedBadgeProps {
  size?: "sm" | "md" | "lg";
  type?: "verified" | "premium" | "trusted";
  className?: string;
  verifiedUntil?: string | null;
}

const sizeMap = { 
  sm: "w-4 h-4", 
  md: "w-5 h-5", 
  lg: "w-7 h-7" 
};

export default function VerifiedBadge({ size = "md", type = "verified", className = "", verifiedUntil }: VerifiedBadgeProps) {
  const spring = { type: "spring" as const, stiffness: 300, damping: 15 };

  if (verifiedUntil && new Date(verifiedUntil) < new Date()) {
    return null; // Expired badge
  }

  // Scalloped Badge SVG Path (Twitter/Instagram Style)
  const ScallopedPath = "M22.25,12.01l-1.43-2.12c-0.12-0.18-0.13-0.42-0.03-0.61l1.11-2.31c0.19-0.39,0-0.86-0.42-1.02L19.46,5.2c-0.21-0.08-0.36-0.27-0.41-0.48l-0.53-2.5c-0.1-0.43-0.54-0.68-0.96-0.56L15.11,2.3c-0.22,0.06-0.45,0-0.61-0.15L12.76,0.39c-0.32-0.3-0.82-0.3-1.14,0l-1.74,1.76c-0.16,0.16-0.39,0.21-0.61,0.15L6.8,1.66c-0.41-0.11-0.86,0.13-0.96,0.56l-0.53,2.5c-0.05,0.22-0.2,0.4-0.41,0.48L2.45,5.95c-0.42,0.16-0.61,0.63-0.42,1.02l1.11,2.31c0.1,0.19,0.09,0.43-0.03,0.61l-1.43,2.12c-0.24,0.36-0.24,0.85,0,1.21l1.43,2.12c0.12,0.18,0.13,0.42,0.03,0.61l-1.11,2.31c-0.19,0.39,0,0.86,0.42,1.02l2.45,0.75c0.21,0.08,0.36,0.27,0.41,0.48l0.53,2.5c0.1,0.43,0.54,0.68,0.96,0.56l2.45-0.64c0.22-0.06,0.45,0,0.61,0.15l1.74,1.76c0.32,0.3,0.82,0.3,1.14,0l1.74-1.76c0.16-0.16,0.39-0.21,0.61-0.15l2.45,0.64c0.41,0.11,0.86-0.13,0.96-0.56l0.53-2.5c0.05-0.22,0.2-0.4,0.41-0.48l2.45-0.75c0.42-0.16,0.61-0.63,0.42-1.02l-1.11-2.31c-0.1-0.19-0.09-0.43,0.03-0.61l1.43-2.12c0.24-0.36,0.24-0.85,0-1.21L22.25,12.01z";

  if (type === "verified") {
    return (
      <motion.svg
        viewBox="0 0 24 24"
        initial={{ scale: 0, rotate: -45 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={spring}
        className={`${sizeMap[size]} ${className}`}
        style={{ filter: "drop-shadow(0 2px 4px rgba(29, 155, 240, 0.3))" }}
      >
        <path
          d={ScallopedPath}
          fill="#1d9bf0"
        />
        <motion.path
          d="M7.5 12l3 3L17 8.5"
          fill="none"
          stroke="white"
          strokeWidth="3.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ delay: 0.2, duration: 0.3 }}
        />
      </motion.svg>
    );
  }

  const Icon = type === "premium" ? Star : Shield;
  const bg = type === "premium" ? "bg-accent shadow-glow" : "bg-success shadow-glow";
  const textColor = type === "premium" ? "text-accent-foreground" : "text-success-foreground";

  return (
    <motion.div
      initial={{ scale: 0, rotate: -180 }}
      animate={{ scale: 1, rotate: 0 }}
      transition={spring}
      className={`rounded-full ${bg} flex items-center justify-center p-0.5 ${sizeMap[size]} ${className}`}
    >
      <Icon className="w-full h-full p-0.5" fill="currentColor" strokeWidth={0} />
    </motion.div>
  );
}
