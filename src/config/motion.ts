/**
 * Motion Tokens & Utilities for Aaliqadr Luxury Perfumerie
 * Cinematic, restrained, quiet-luxury animations.
 * Durations: 600–1000ms, Easing: cubic-bezier(0.22, 1, 0.36, 1)
 */

export const DURATIONS = {
  instant: 0.15,
  fast: 0.35,
  normal: 0.7,
  slow: 0.9,
  story: 1.1,
  loaderMax: 2.2,
} as const;

export const EASINGS = {
  luxury: [0.22, 1, 0.36, 1] as const,
  soft: [0.16, 1, 0.3, 1] as const,
  enter: [0.0, 0.0, 0.2, 1] as const,
  exit: [0.4, 0.0, 1, 1] as const,
  luxuryCubic: "cubic-bezier(0.22, 1, 0.36, 1)",
} as const;

export const STAGGER = {
  tight: 0.04,
  standard: 0.08,
  deliberate: 0.12,
} as const;

export const VARIANTS = {
  fadeIn: {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { duration: DURATIONS.normal, ease: EASINGS.luxury },
    },
  },
  fadeUp: {
    hidden: { opacity: 0, y: 24 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: DURATIONS.normal, ease: EASINGS.luxury },
    },
  },
  fadeScale: {
    hidden: { opacity: 0, scale: 0.96 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: { duration: DURATIONS.slow, ease: EASINGS.luxury },
    },
  },
  staggerContainer: (staggerDelay = STAGGER.standard, delayChildren = 0) => ({
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: staggerDelay,
        delayChildren,
      },
    },
  }),
} as const;
