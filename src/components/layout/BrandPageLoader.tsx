"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { mark } from "@/components/brand/logo-paths";
import { EASINGS } from "@/config/motion";
import { useReducedMotionPreference } from "@/lib/use-motion";

export function BrandPageLoader() {
  const [visible, setVisible] = useState(false);
  const [drawDone, setDrawDone] = useState(false);
  const reduced = useReducedMotionPreference();

  useEffect(() => {
    // Check if user already saw the intro loader in this browser session
    try {
      const seen = sessionStorage.getItem("aaliqadr_loader_seen");
      if (seen || reduced) return;
      requestAnimationFrame(() => setVisible(true));
    } catch {
      return;
    }

    // Auto dismiss after 2.1s max
    const timer = setTimeout(() => dismiss(), 2100);

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === " " || e.key === "Enter") dismiss();
    };
    window.addEventListener("keydown", onKeyDown);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [reduced]);

  function dismiss() {
    try {
      sessionStorage.setItem("aaliqadr_loader_seen", "1");
    } catch {
      // ignore
    }
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <AnimatePresence onExitComplete={() => dismiss()}>
      <div
        role="dialog"
        aria-label="Aaliqadr Introduction"
        className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-auto select-none"
        onClick={dismiss}
      >
        {/* Left Curtain */}
        <motion.div
          initial={{ x: "0%" }}
          exit={{ x: "-100%" }}
          transition={{ duration: 0.8, ease: EASINGS.luxury }}
          className="absolute inset-y-0 left-0 w-1/2 bg-obsidian border-r border-line"
        />

        {/* Right Curtain */}
        <motion.div
          initial={{ x: "0%" }}
          exit={{ x: "100%" }}
          transition={{ duration: 0.8, ease: EASINGS.luxury }}
          className="absolute inset-y-0 right-0 w-1/2 bg-obsidian border-l border-line"
        />

        {/* Center Monogram SVG Stroke Animation */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 1.05 }}
          transition={{ duration: 0.6, ease: EASINGS.luxury }}
          className="relative z-20 flex flex-col items-center gap-4 text-center px-4"
        >
          <svg
            viewBox={mark.viewBox}
            className="w-24 sm:w-32 h-auto text-gold"
            fill="none"
          >
            {mark.paths.map((d, i) => (
              <motion.path
                key={i}
                d={d}
                stroke="#C9A96E"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={{ pathLength: 0, fill: "rgba(201,169,110,0)" }}
                animate={{
                  pathLength: 1,
                  fill: drawDone ? "rgba(201,169,110,1)" : "rgba(201,169,110,0.12)",
                }}
                transition={{
                  pathLength: { duration: 1.1, ease: EASINGS.luxury },
                  fill: { duration: 0.4, delay: 0.9 },
                }}
                onAnimationComplete={() => setDrawDone(true)}
              />
            ))}
          </svg>

          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.6 }}
            className="flex flex-col items-center gap-1"
          >
            <span className="font-display text-xl sm:text-2xl tracking-[0.22em] text-ivory font-light uppercase">
              Aaliqadr
            </span>
            <span className="font-caps text-[9px] uppercase tracking-[0.28em] text-gold/80">
              Extrait de Parfum · 28%
            </span>
          </motion.div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              dismiss();
            }}
            className="mt-6 font-caps text-[9px] uppercase tracking-[0.22em] text-muted/60 hover:text-gold transition-colors"
          >
            Skip Intro [ESC]
          </button>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
