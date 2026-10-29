"use client";

import { motion, AnimatePresence } from "framer-motion";
import { formatPrice, type Paise } from "@/lib/money";
import { EASINGS } from "@/config/motion";
import { useReducedMotionPreference } from "@/lib/use-motion";

export function RollingNumberPrice({
  priceP,
  className,
}: {
  priceP: Paise;
  className?: string;
}) {
  const reduced = useReducedMotionPreference();
  const formatted = formatPrice(priceP);

  if (reduced) {
    return <span className={className}>{formatted}</span>;
  }

  return (
    <span className={`inline-flex items-center overflow-hidden h-[1.3em] font-display text-ivory ${className ?? ""}`}>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={priceP}
          initial={{ y: "80%", opacity: 0 }}
          animate={{ y: "0%", opacity: 1 }}
          exit={{ y: "-80%", opacity: 0 }}
          transition={{
            duration: 0.45,
            ease: EASINGS.luxury,
          }}
          className="inline-block"
        >
          {formatted}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}
