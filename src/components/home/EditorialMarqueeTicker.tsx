"use client";

interface MarqueeItem {
  solid: string;
  outline: string;
  symbol: string;
}

const MARQUEE_ITEMS: MarqueeItem[] = [
  { solid: "28% EXTRAIT DE PARFUM", outline: "HAUTE PARFUMERIE", symbol: "✦" },
  { solid: "CRAFTED FOR YOUR RASHI", outline: "VEDIC ALCHEMY", symbol: "✦" },
  { solid: "12 ASTROLOGICAL SIGNATURES", outline: "ONE DESTINY", symbol: "✦" },
  { solid: "AGED 45 DAYS IN CELLAR", outline: "NOBLE BOTANICALS", symbol: "✦" },
  { solid: "12+ HOUR OIL LONGEVITY", outline: "INTIMATE PROJECTION", symbol: "✦" },
  { solid: "COMPLIMENTARY CLIMATE AIR", outline: "TAMPER-EVIDENT SEAL", symbol: "✦" },
];

/**
 * EditorialMarqueeTicker
 * Inspired by luxury high-fashion editorial marquee tickers (e.g. zodiacperfumes.com sf__scrolling-text & sf__text-stroke)
 * Features alternating solid gold text with giant hollow outline typography (-webkit-text-stroke)
 * Infinite silky smooth CSS loop with pause-on-hover interaction
 */
export function EditorialMarqueeTicker() {
  // Duplicate for seamless 100% to -33.333% loop
  const loopItems = [...MARQUEE_ITEMS, ...MARQUEE_ITEMS, ...MARQUEE_ITEMS];

  return (
    <div
      aria-label="Aaliqadr Haute Parfumerie Brand Features Ticker"
      className="editorial-marquee-root relative w-full overflow-hidden bg-[#07050A] py-5 sm:py-6 select-none"
    >
      <style>{`
        @keyframes marquee-glide {
          0% {
            transform: translate3d(0, 0, 0);
          }
          100% {
            transform: translate3d(-33.333%, 0, 0);
          }
        }
        .editorial-marquee-track {
          display: flex;
          width: max-content;
          animation: marquee-glide 42s linear infinite;
          will-change: transform;
        }
        .editorial-marquee-root:hover .editorial-marquee-track {
          animation-play-state: paused;
        }
        .editorial-text-stroke {
          -webkit-text-stroke: 1px rgba(201, 169, 110, 0.45);
          -webkit-text-fill-color: transparent;
          color: transparent;
          transition: all 0.3s ease;
        }
        .editorial-marquee-root:hover .editorial-text-stroke {
          -webkit-text-stroke: 1px rgba(201, 169, 110, 0.75);
        }
        @media (prefers-reduced-motion: reduce) {
          .editorial-marquee-track {
            animation: none;
            flex-wrap: wrap;
            justify-content: center;
          }
        }
      `}</style>

      {/* Edge gradient masks for luxurious vanishing boundaries */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 sm:w-36 bg-gradient-to-r from-[#07050A] to-transparent"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 sm:w-36 bg-gradient-to-l from-[#07050A] to-transparent"
      />

      <div className="editorial-marquee-track">
        {loopItems.map((item, idx) => (
          <div
            key={idx}
            className="flex items-center gap-6 sm:gap-10 px-4 sm:px-6 shrink-0"
          >
            {/* Solid Gold Cormorant Serif Text */}
            <span className="font-display text-xl sm:text-2xl md:text-3xl font-light tracking-[0.16em] text-[#E0C892] drop-shadow-[0_2px_8px_rgba(201,169,110,0.25)]">
              {item.solid}
            </span>

            {/* Glowing Golden Starburst Glyph */}
            <span
              aria-hidden
              className="text-[#C9A96E] text-xs sm:text-sm animate-pulse opacity-80"
            >
              {item.symbol}
            </span>

            {/* Hollow Luxury Text-Stroke (High Fashion Editorial Runway Style) */}
            <span className="editorial-text-stroke font-display text-2xl sm:text-3xl md:text-4xl font-normal uppercase tracking-[0.2em] italic">
              {item.outline}
            </span>

            {/* Micro Gold Divider Pellet */}
            <span
              aria-hidden
              className="size-1.5 rounded-full bg-[#C9A96E]/50 shadow-[0_0_8px_rgba(201,169,110,0.8)]"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
