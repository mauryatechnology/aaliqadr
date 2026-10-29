"use client";

import { motion } from "framer-motion";
import { SIGNS, type ZodiacSign, type ZodiacSlug } from "@/config/zodiac";
import { BottleArt } from "@/components/zodiac/BottleArt";
import { ZodiacGoldGlyph } from "@/components/zodiac/ZodiacGoldGlyph";
import { EASINGS, DURATIONS } from "@/config/motion";
import { useReducedMotionPreference } from "@/lib/use-motion";

const RASHI_DEVANAGARI: Record<string, string> = {
  aries: "मेष",
  taurus: "वृषभ",
  gemini: "मिथुन",
  cancer: "कर्क",
  leo: "सिंह",
  virgo: "कन्या",
  libra: "तुला",
  scorpio: "वृश्चिक",
  sagittarius: "धनु",
  capricorn: "मकर",
  aquarius: "कुम्भ",
  pisces: "मीन",
};

export function CelestialSignReveal({ sign }: { sign: ZodiacSign }) {
  const reduced = useReducedMotionPreference();
  const signIndex = Math.max(0, SIGNS.findIndex((s) => s.slug === sign.slug));
  // 30 degrees per sign, 12 signs = 360 degrees
  const targetRotation = 720 + signIndex * 30;

  return (
    <div className="relative mx-auto flex flex-col items-center justify-center my-8 w-full max-w-sm aspect-square select-none">
      {/* 1. Spinning Astrological Wheel that eases to the chosen sign */}
      <motion.div
        initial={reduced ? undefined : { rotate: 0 }}
        animate={reduced ? undefined : { rotate: targetRotation }}
        transition={{
          duration: 1.6,
          ease: EASINGS.soft,
        }}
        className="absolute inset-0 pointer-events-none flex items-center justify-center"
      >
        <svg viewBox="0 0 320 320" className="size-full" fill="none">
          <circle
            cx="160"
            cy="160"
            r="150"
            stroke="#C9A96E"
            strokeOpacity="0.25"
            strokeWidth="1"
            strokeDasharray="4 6"
          />
          <circle
            cx="160"
            cy="160"
            r="120"
            stroke="#C9A96E"
            strokeOpacity="0.15"
            strokeWidth="0.8"
          />
          {Array.from({ length: 12 }).map((_, i) => {
            const rad = (i * 30 * Math.PI) / 180;
            const x1 = 160 + 120 * Math.cos(rad);
            const y1 = 160 + 120 * Math.sin(rad);
            const x2 = 160 + 150 * Math.cos(rad);
            const y2 = 160 + 150 * Math.sin(rad);
            return (
              <line
                key={i}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="#C9A96E"
                strokeOpacity="0.3"
                strokeWidth="1"
              />
            );
          })}
        </svg>
      </motion.div>

      {/* 2. Constellation Lines Drawing In */}
      <svg
        viewBox="0 0 200 200"
        className="absolute inset-8 size-[calc(100%-4rem)] pointer-events-none"
        fill="none"
      >
        <motion.path
          d="M40 100 L80 60 L120 70 L160 110 L140 150 L70 140 Z M80 60 L140 150 M120 70 L70 140"
          stroke="#C9A96E"
          strokeWidth="1.2"
          strokeOpacity="0.45"
          initial={reduced ? undefined : { pathLength: 0 }}
          animate={reduced ? undefined : { pathLength: 1 }}
          transition={{ duration: 1.1, delay: 0.6, ease: EASINGS.luxury }}
        />
        {[
          [40, 100],
          [80, 60],
          [120, 70],
          [160, 110],
          [140, 150],
          [70, 140],
        ].map(([cx, cy], idx) => (
          <motion.circle
            key={idx}
            cx={cx}
            cy={cy}
            r="3"
            fill="#C9A96E"
            initial={reduced ? undefined : { scale: 0, opacity: 0 }}
            animate={reduced ? undefined : { scale: 1, opacity: 0.9 }}
            transition={{ delay: 0.8 + idx * 0.1, duration: 0.4 }}
          />
        ))}
      </svg>

      {/* 3. Soft Sign Glow */}
      <div
        className="absolute size-44 rounded-full blur-3xl opacity-35"
        style={{ background: sign.theme.glow }}
      />

      {/* 4. Matching Bottle Rises Into View */}
      <motion.div
        initial={reduced ? undefined : { opacity: 0, y: 32, scale: 0.94 }}
        animate={reduced ? undefined : { opacity: 1, y: 0, scale: 1 }}
        transition={{
          duration: DURATIONS.slow,
          delay: 0.85,
          ease: EASINGS.luxury,
        }}
        className="relative z-10 flex flex-col items-center drop-shadow-[0_20px_45px_rgba(0,0,0,0.85)]"
      >
        <div className="w-32 sm:w-40 h-auto">
          <BottleArt sign={sign.slug} preload className="size-full object-contain" />
        </div>
        <div className="mt-2.5 flex items-center gap-2 rounded-full border border-gold/40 bg-surface/90 px-4 py-1.5 backdrop-blur-md shadow-xs">
          <ZodiacGoldGlyph sign={sign.slug as ZodiacSlug} className="size-4 shrink-0" />
          <span className="font-rashi text-xs text-gold-soft font-normal">
            ({RASHI_DEVANAGARI[sign.slug]} राशि)
          </span>
          <span className="font-caps text-[10.5px] uppercase tracking-[0.2em] text-ivory font-medium">
            {sign.name} · {sign.fragrance.name}
          </span>
        </div>
      </motion.div>
    </div>
  );
}
