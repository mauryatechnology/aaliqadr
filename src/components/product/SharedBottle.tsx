"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { EASINGS } from "@/config/motion";
import { useReducedMotionPreference } from "@/lib/use-motion";

export function SharedBottle({
  slug,
  children,
  className,
  signAccent: _signAccent,
}: {
  slug: string;
  children: ReactNode;
  className?: string;
  signAccent?: string;
}) {
  const reduced = useReducedMotionPreference();

  if (reduced) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      layoutId={`shared-bottle-${slug}`}
      transition={{
        duration: 0.8,
        ease: EASINGS.luxury,
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function SharedGlow({
  slug,
  signAccent = "#C9A96E",
  className,
}: {
  slug: string;
  signAccent?: string;
  className?: string;
}) {
  const reduced = useReducedMotionPreference();

  if (reduced) {
    return (
      <div
        className={className}
        style={{
          background: `radial-gradient(circle at 50% 50%, color-mix(in srgb, ${signAccent} 20%, transparent) 0%, transparent 72%)`,
        }}
      />
    );
  }

  return (
    <motion.div
      layoutId={`shared-glow-${slug}`}
      transition={{
        duration: 0.8,
        ease: EASINGS.luxury,
      }}
      className={className}
      style={{
        background: `radial-gradient(circle at 50% 50%, color-mix(in srgb, ${signAccent} 25%, transparent) 0%, transparent 72%)`,
      }}
    />
  );
}
