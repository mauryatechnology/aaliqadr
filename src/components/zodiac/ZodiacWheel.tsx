"use client";

import { useRef } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { SIGNS, ZODIAC, type ZodiacSign, type ZodiacSlug } from "@/config/zodiac";
import { Glyph } from "@/components/zodiac/Glyph";
import { BottleArt } from "@/components/zodiac/BottleArt";
import { routes } from "@/lib/routes";
import { cn } from "@/lib/cn";
import { useMouseParallax, useReducedMotionPreference } from "@/lib/use-motion";
import { DURATIONS, EASINGS } from "@/config/motion";

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

/**
 * Interactive Celestial Zodiac Wheel (Rashi Ring)
 * - 12 interactive orbiting Rashi stations with constellation line glyphs and Devanagari script
 * - Continuous 60s smooth orbital rotation (pauses on hover for effortless selection)
 * - Counter-rotation keeps all glyphs and text upright
 * - Centered current season Extrait flacon with soft celestial aura
 */
export function ZodiacWheel({
  currentSign,
  className,
}: {
  currentSign?: ZodiacSign;
  className?: string;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotionPreference();
  const mouse = useMouseParallax(rootRef, 12);

  const activeSign = currentSign ?? ZODIAC.aries;
  const signColor = activeSign.theme.primary;

  return (
    <div
      ref={rootRef}
      aria-label="The 12 Zodiac Houses and Rashis"
      className={cn(
        "zodiac-wheel-root relative mx-auto aspect-square w-full max-w-[min(92vw,580px)] select-none",
        className,
      )}
    >
      {/* Inline styles for 80s smooth orbital rotation and hover-pause */}
      <style>{`
        @keyframes orbit-cw {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
        @keyframes orbit-ccw {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(-360deg);
          }
        }
        .zodiac-wheel-track {
          animation: orbit-cw 80s linear infinite !important;
          transform-origin: 50% 50% !important;
          will-change: transform;
        }
        .zodiac-wheel-station {
          animation: orbit-ccw 80s linear infinite !important;
          transform-origin: 50% 50% !important;
          will-change: transform;
        }
        .zodiac-wheel-root:hover .zodiac-wheel-track,
        .zodiac-wheel-root:hover .zodiac-wheel-station,
        .zodiac-wheel-track:hover,
        .zodiac-wheel-station:hover {
          animation-play-state: paused !important;
        }
        @media (prefers-reduced-motion: reduce) {
          .zodiac-wheel-track,
          .zodiac-wheel-station {
            animation: none !important;
          }
        }
      `}</style>

      {/* 1. Background Astronomical Coordinate Rings (SVG) */}
      <svg
        viewBox="0 0 600 600"
        className="pointer-events-none absolute inset-0 size-full"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden
      >
        <defs>
          <radialGradient id="ring-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#C9A96E" stopOpacity="0.14" />
            <stop offset="55%" stopColor={signColor} stopOpacity="0.06" />
            <stop offset="100%" stopColor="#C9A96E" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Ambient celestial bloom */}
        <circle cx="300" cy="300" r="260" fill="url(#ring-glow)" />

        {/* Outer 1px hairline ring */}
        <circle
          cx="300"
          cy="300"
          r="260"
          stroke="#C9A96E"
          strokeOpacity="0.22"
          strokeWidth="1"
        />

        {/* Dashed astronomical ecliptic ring */}
        <circle
          cx="300"
          cy="300"
          r="248"
          stroke="#C9A96E"
          strokeOpacity="0.12"
          strokeWidth="1"
          strokeDasharray="2 6"
        />

        {/* Inner track boundary ring */}
        <circle
          cx="300"
          cy="300"
          r="170"
          stroke="#C9A96E"
          strokeOpacity="0.18"
          strokeWidth="1"
        />

        {/* Core bottle framing ring */}
        <circle
          cx="300"
          cy="300"
          r="125"
          stroke="#C9A96E"
          strokeOpacity="0.15"
          strokeWidth="1"
          strokeDasharray="4 8"
        />

        {/* 72 Degree astronomical tick marks */}
        {Array.from({ length: 72 }).map((_, i) => {
          const angle = (i * 5 * Math.PI) / 180;
          const isMajor = i % 6 === 0;
          const tickLen = isMajor ? 10 : 4;
          const r1 = 260;
          const r2 = r1 - tickLen;
          const x1 = 300 + r1 * Math.cos(angle);
          const y1 = 300 + r1 * Math.sin(angle);
          const x2 = 300 + r2 * Math.cos(angle);
          const y2 = 300 + r2 * Math.sin(angle);

          return (
            <line
              key={`tick-${i}`}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke="#C9A96E"
              strokeOpacity={isMajor ? 0.35 : 0.15}
              strokeWidth={isMajor ? 1.2 : 0.75}
            />
          );
        })}

        {/* 12 House Division Rays */}
        {Array.from({ length: 12 }).map((_, i) => {
          const angle = (i * 30 * Math.PI) / 180;
          const x1 = 300 + 130 * Math.cos(angle);
          const y1 = 300 + 130 * Math.sin(angle);
          const x2 = 300 + 165 * Math.cos(angle);
          const y2 = 300 + 165 * Math.sin(angle);

          return (
            <line
              key={`spoke-${i}`}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke="#C9A96E"
              strokeOpacity="0.16"
              strokeWidth="0.8"
              strokeDasharray="3 5"
            />
          );
        })}
      </svg>

      {/* 2. Centered Current Season Extrait Flacon with Parallax & Fade-Up Scale */}
      <motion.div
        initial={{ opacity: 0, scale: reduced ? 1 : 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: DURATIONS.slow, ease: EASINGS.luxury }}
        className="absolute inset-[24%] z-10 flex flex-col items-center justify-center will-change-transform"
        style={{
          transform: reduced ? undefined : `translate3d(${mouse.x}px, ${mouse.y}px, 0)`,
        }}
      >
        <Link
          href={routes.product(activeSign.fragrance.slug)}
          className="group/bottle relative flex flex-col items-center justify-center transition-transform duration-700 ease-lux hover:scale-105"
          aria-label={`Current Season Ingress: ${activeSign.name} (${activeSign.rashi}) - ${activeSign.fragrance.name}`}
        >
          {/* Radiant sign glow behind bottle */}
          <div
            className="absolute size-40 sm:size-48 rounded-full blur-2xl opacity-35 transition-opacity duration-500 group-hover/bottle:opacity-55"
            style={{ background: activeSign.theme.glow }}
          />

          {/* Perfume bottle art */}
          <div
            className="relative w-28 sm:w-36 md:w-44 drop-shadow-[0_20px_40px_rgba(0,0,0,0.85)]"
            style={{
              filter: `drop-shadow(0 15px 30px rgba(0,0,0,0.8)) drop-shadow(0 0 35px ${signColor}55)`,
            }}
          >
            <BottleArt sign={activeSign.slug} preload className="w-full h-auto select-none" />
          </div>

          {/* Quick indicator badge below bottle */}
          <span className="mt-1 inline-block border border-gold/30 bg-obsidian/90 px-2.5 py-0.5 font-caps text-[8px] sm:text-[9px] uppercase tracking-[0.2em] text-gold backdrop-blur-sm transition-colors group-hover/bottle:border-gold group-hover/bottle:text-ivory">
            {activeSign.name} · {RASHI_DEVANAGARI[activeSign.slug]}
          </span>
        </Link>
      </motion.div>

      {/* 3. Orbiting Track of 12 Interactive Rashi Stations with Subtle Parallax */}
      <div
        className="zodiac-wheel-track absolute inset-0 will-change-transform"
        style={{
          transform: reduced ? undefined : `translate3d(${mouse.x * 0.45}px, ${mouse.y * 0.45}px, 0)`,
        }}
      >
        <ul className="absolute inset-0 m-0 p-0 list-none">
          {SIGNS.map((s, i) => {
            // 12 signs positioned at 30 degree intervals around the 41% radius
            const angle = (i / 12) * Math.PI * 2 - Math.PI / 2;
            const r = 41; // radius in percentage
            const x = 50 + r * Math.cos(angle);
            const y = 50 + r * Math.sin(angle);
            const isCurrent = s.slug === activeSign.slug;
            const devanagari = RASHI_DEVANAGARI[s.slug];

            return (
              <li
                key={s.slug}
                data-zodiac={s.slug}
                data-element={s.element}
                className="absolute -translate-x-1/2 -translate-y-1/2"
                style={{ left: `${x}%`, top: `${y}%` }}
              >
                {/* Counter-rotation keeps station upright and readable at every point */}
                <div className="zodiac-wheel-station">
                  <Link
                    href={routes.sign(s.slug)}
                    className="group/station flex flex-col items-center gap-1 rounded-full p-1.5 text-center transition-transform duration-300 hover:scale-115 focus-visible:outline-2 focus-visible:outline-gold"
                    aria-label={`Explore House of ${s.name} (${devanagari} · ${s.rashi}): ${s.fragrance.name}`}
                  >
                    {/* Glowing circular medallion */}
                    <span
                      className={cn(
                        "grid size-10 sm:size-12 place-items-center rounded-full border transition-all duration-300 ease-lux backdrop-blur-sm",
                        isCurrent
                          ? "ring-2 ring-gold/60 scale-105"
                          : "group-hover/station:ring-1 group-hover/station:ring-gold",
                      )}
                      style={{
                        borderColor: isCurrent
                          ? "var(--z-primary)"
                          : "color-mix(in oklab, var(--z-primary) 40%, transparent)",
                        background: "color-mix(in oklab, var(--z-bg) 85%, transparent)",
                        boxShadow: isCurrent
                          ? "0 0 18px 2px var(--z-glow)"
                          : "0 0 10px -2px var(--z-glow)",
                        color: "var(--z-primary)",
                      }}
                    >
                      <Glyph sign={s.slug as ZodiacSlug} className="size-4 sm:size-5" label={false} />
                    </span>

                    {/* Rashi & Western Name beneath */}
                    <div className="flex flex-col items-center leading-none">
                      <span className="font-caps text-[8px] sm:text-[9px] uppercase tracking-[0.16em] text-ivory/80 transition-colors group-hover/station:text-gold">
                        {s.name}
                      </span>
                      <span className="font-rashi text-[8px] sm:text-[9px] text-gold/80 mt-0.5">
                        {devanagari}
                      </span>
                    </div>
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
