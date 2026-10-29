"use client";

import { motion } from "framer-motion";
import type { Note } from "@/config/zodiac";
import { Reveal } from "@/components/motion/Reveal";
import { DURATIONS, EASINGS } from "@/config/motion";
import { useReducedMotionPreference } from "@/lib/use-motion";

const TIERS = [
  {
    key: "top",
    label: "Top notes",
    phase: "Opening · First 15 minutes",
    widthClass: "w-full sm:max-w-[72%]",
    pillBorder: "border-gold/30 hover:border-gold/60",
    glow: "rgba(201,169,110,0.1)",
  },
  {
    key: "heart",
    label: "Heart notes",
    phase: "Core · 2 to 6 hours",
    widthClass: "w-full sm:max-w-[86%]",
    pillBorder: "border-gold/35 hover:border-gold/70",
    glow: "rgba(224,200,146,0.12)",
  },
  {
    key: "base",
    label: "Base notes",
    phase: "Drydown · 8 to 14+ hours",
    widthClass: "w-full sm:max-w-full",
    pillBorder: "border-gold/40 hover:border-gold",
    glow: "rgba(156,127,76,0.14)",
  },
] as const;

export function NotesPyramid({ notes }: { notes: { top: Note[]; heart: Note[]; base: Note[] } }) {
  const reduced = useReducedMotionPreference();

  return (
    <ol className="flex flex-col items-center gap-0 w-full max-w-3xl mx-auto">
      {TIERS.map((tier, i) => {
        const tierNotes = notes[tier.key] ?? [];
        if (tierNotes.length === 0) return null;

        return (
          <div key={tier.key} className="w-full flex flex-col items-center">
            {/* Thin gold line drawing between tiers */}
            {i > 0 && (
              <div className="flex justify-center w-full my-2.5" aria-hidden>
                <svg width="2" height="32" viewBox="0 0 2 32" fill="none">
                  {reduced ? (
                    <line x1="1" y1="0" x2="1" y2="32" stroke="#C9A96E" strokeWidth="1" strokeOpacity="0.4" />
                  ) : (
                    <motion.line
                      x1="1"
                      y1="0"
                      x2="1"
                      y2="32"
                      stroke="#C9A96E"
                      strokeWidth="1"
                      strokeDasharray="32"
                      initial={{ strokeDashoffset: 32 }}
                      whileInView={{ strokeDashoffset: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: DURATIONS.slow, ease: EASINGS.luxury }}
                    />
                  )}
                </svg>
              </div>
            )}

            <Reveal as="li" delay={i * 0.12} className="w-full flex justify-center" y={16}>
              <div
                className={`relative flex flex-col items-center gap-3.5 border border-line bg-surface/90 px-6 py-6 text-center ${tier.widthClass} transition-all duration-300 hover:border-gold/30 hover:shadow-xl`}
                style={{
                  background: `radial-gradient(100% 120% at 50% 0%, ${tier.glow}, transparent 75%), #14121A`,
                }}
              >
                {/* Header with high-contrast label and clear timing phase */}
                <div className="flex flex-col items-center gap-1">
                  <span className="font-caps text-xs sm:text-sm font-semibold uppercase tracking-[0.24em] text-gold">
                    {tier.label}
                  </span>
                  <span className="text-xs sm:text-sm font-light text-muted">
                    {tier.phase}
                  </span>
                </div>

                {/* Note pills: animated one by one with gold accents */}
                <ul className="flex flex-wrap justify-center gap-2.5 pt-1">
                  {tierNotes.map((n, idx) => (
                    <motion.li
                      key={n.name}
                      initial={reduced ? undefined : { opacity: 0, y: 8 }}
                      whileInView={reduced ? undefined : { opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{
                        duration: DURATIONS.fast,
                        delay: 0.15 + idx * 0.08,
                        ease: EASINGS.luxury,
                      }}
                      className={`group relative rounded-none border ${tier.pillBorder} bg-bg/80 px-4 py-2 font-caps text-xs uppercase tracking-wider text-ivory backdrop-blur-md transition-all duration-300 hover:border-gold hover:text-gold`}
                      title={n.family ? `Olfactive Family: ${n.family}` : undefined}
                    >
                      <span className="relative z-10 flex items-center gap-2">
                        <span className="size-1 rounded-full bg-gold" aria-hidden />
                        {n.name}
                      </span>
                    </motion.li>
                  ))}
                </ul>
              </div>
            </Reveal>
          </div>
        );
      })}
    </ol>
  );
}
