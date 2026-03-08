import { motion } from "framer-motion";
import { CheckCircle, Shield, Star } from "lucide-react";

interface VerifiedBadgeProps {
  size?: "sm" | "md" | "lg";
  type?: "verified" | "premium" | "trusted";
  className?: string;
  animate?: boolean;
}

const sizeMap = {
  sm: "w-4 h-4",
  md: "w-5 h-5",
  lg: "w-7 h-7",
};

const containerSizeMap = {
  sm: "w-5 h-5",
  md: "w-6 h-6",
  lg: "w-8 h-8",
};

export default function VerifiedBadge({ size = "md", type = "verified", className = "", animate = true }: VerifiedBadgeProps) {
  const Wrapper = animate ? motion.div : "div";
  const animateProps = animate
    ? {
        initial: { scale: 0, rotate: -180 },
        animate: { scale: 1, rotate: 0 },
        transition: { type: "spring", stiffness: 300, damping: 15 },
      }
    : {};

  if (type === "verified") {
    return (
      <Wrapper
        className={`${containerSizeMap[size]} rounded-full gradient-primary flex items-center justify-center shadow-glow ${className}`}
        {...animateProps}
      >
        <CheckCircle className={`${sizeMap[size]} text-primary-foreground`} strokeWidth={2.5} />
      </Wrapper>
    );
  }

  if (type === "premium") {
    return (
      <Wrapper
        className={`${containerSizeMap[size]} rounded-full bg-accent flex items-center justify-center ${className}`}
        {...animateProps}
      >
        <Star className={`${sizeMap[size]} text-accent-foreground`} fill="currentColor" strokeWidth={0} />
      </Wrapper>
    );
  }

  return (
    <Wrapper
      className={`${containerSizeMap[size]} rounded-full bg-success flex items-center justify-center ${className}`}
      {...animateProps}
    >
      <Shield className={`${sizeMap[size]} text-success-foreground`} strokeWidth={2.5} />
    </Wrapper>
  );
}
