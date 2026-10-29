"use client";

import Link from "next/link";
import { SIGNS } from "@/config/zodiac";
import { routes } from "@/lib/routes";

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

export function ZodiacMarquee() {
  const items = [...SIGNS, ...SIGNS]; // Doubled for seamless loop

  return (
    <div
      aria-label="Twelve Astrological Signs Marquee"
      className="zodiac-marquee-root relative w-full overflow-hidden border-y border-line bg-surface/60 py-4 select-none backdrop-blur-sm"
    >
      <style>{`
        @keyframes marquee-scroll {
          from {
            transform: translate3d(0, 0, 0);
          }
          to {
            transform: translate3d(-50%, 0, 0);
          }
        }
        .zodiac-marquee-track {
          display: flex;
          width: max-content;
          animation: marquee-scroll 55s linear infinite;
          will-change: transform;
        }
        .zodiac-marquee-root:hover .zodiac-marquee-track {
          animation-play-state: paused;
        }
        @media (prefers-reduced-motion: reduce) {
          .zodiac-marquee-track {
            animation: none;
            flex-wrap: wrap;
            justify-content: center;
          }
        }
      `}</style>

      {/* Edge gradient masks for luxurious vanishing boundaries */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-0 z-10 w-20 bg-gradient-to-r from-bg to-transparent"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 right-0 z-10 w-20 bg-gradient-to-l from-bg to-transparent"
      />

      <div className="zodiac-marquee-track">
        {items.map((s, idx) => {
          const rashi = RASHI_DEVANAGARI[s.slug];
          return (
            <Link
              key={`${s.slug}-${idx}`}
              href={routes.sign(s.slug)}
              className="group inline-flex items-center gap-4 px-6 sm:px-8 transition-colors"
            >
              <span className="font-display text-lg sm:text-xl font-light tracking-[0.16em] text-ivory/80 group-hover:text-gold transition-colors">
                {s.name}
              </span>
              <span className="font-rashi text-xs tracking-wider text-gold/60 group-hover:text-gold transition-colors">
                ({rashi})
              </span>
              <span className="font-caps text-[9px] uppercase tracking-[0.24em] text-muted/60 group-hover:text-gold-light transition-colors">
                {s.fragrance.name}
              </span>
              <span className="size-1 rounded-full bg-gold/40 mx-2" aria-hidden />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
