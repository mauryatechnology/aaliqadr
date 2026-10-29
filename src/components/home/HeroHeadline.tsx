"use client";

import { motion } from "framer-motion";
import { DURATIONS, EASINGS } from "@/config/motion";
import { useReducedMotionPreference } from "@/lib/use-motion";

export function HeroHeadline() {
  const reduced = useReducedMotionPreference();

  const lineVariants = {
    hidden: { y: reduced ? 0 : "105%", opacity: reduced ? 0 : 1 },
    visible: (i: number) => ({
      y: 0,
      opacity: 1,
      transition: {
        duration: DURATIONS.slow,
        ease: EASINGS.luxury,
        delay: i * 0.16,
      },
    }),
  };

  const italicVariants = {
    hidden: { opacity: 0, y: reduced ? 0 : 8 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: DURATIONS.normal,
        ease: EASINGS.luxury,
        delay: 0.48, // Fades in last
      },
    },
  };

  return (
    <h1 className="font-display text-[clamp(2.5rem,6.5vw,5.5rem)] font-light leading-[1.04] tracking-tight text-ivory max-w-4xl mx-auto">
      <span className="block overflow-hidden pb-1">
        <motion.span
          custom={0}
          initial="hidden"
          animate="visible"
          variants={lineVariants}
          className="inline-block"
        >
          A celestial signature,
        </motion.span>
      </span>
      <span className="block overflow-hidden">
        <motion.span
          custom={1}
          initial="hidden"
          animate="visible"
          variants={lineVariants}
          className="inline-block"
        >
          <motion.em
            initial="hidden"
            animate="visible"
            variants={italicVariants}
            className="italic font-light text-gold inline-block"
          >
            written in your stars
          </motion.em>
        </motion.span>
      </span>
    </h1>
  );
}
