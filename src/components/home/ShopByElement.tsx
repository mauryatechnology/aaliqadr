import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Reveal } from "@/components/motion/Reveal";
import { Glyph } from "@/components/zodiac/Glyph";
import { routes } from "@/lib/routes";
import type { ZodiacSlug } from "@/config/zodiac";

interface ElementCard {
  id: "fire" | "earth" | "air" | "water";
  title: string;
  vedic: string;
  scent: string;
  signNames: string;
  signs: ZodiacSlug[];
  accentColor: string;
  bgGlow: string;
  collectionSlug: string;
}

const ELEMENTS_DATA: ElementCard[] = [
  {
    id: "fire",
    title: "Fire",
    vedic: "Agni · अग्नि",
    scent: "Bold, spicy and warm",
    signNames: "Aries · Leo · Sagittarius",
    signs: ["aries", "leo", "sagittarius"],
    accentColor: "#D4381C",
    bgGlow:
      "radial-gradient(ellipse 120% 80% at 50% 0%, rgba(212, 56, 28, 0.16) 0%, rgba(212, 56, 28, 0.03) 50%, transparent 75%)",
    collectionSlug: "fire-signs",
  },
  {
    id: "earth",
    title: "Earth",
    vedic: "Prithvi · पृथ्वी",
    scent: "Woody, rich and grounded",
    signNames: "Taurus · Virgo · Capricorn",
    signs: ["taurus", "virgo", "capricorn"],
    accentColor: "#2E6B3E",
    bgGlow:
      "radial-gradient(ellipse 120% 80% at 50% 0%, rgba(46, 107, 62, 0.16) 0%, rgba(46, 107, 62, 0.03) 50%, transparent 75%)",
    collectionSlug: "earth-signs",
  },
  {
    id: "air",
    title: "Air",
    vedic: "Vayu · वायु",
    scent: "Light, floral and airy",
    signNames: "Gemini · Libra · Aquarius",
    signs: ["gemini", "libra", "aquarius"],
    accentColor: "#8E5AA8",
    bgGlow:
      "radial-gradient(ellipse 120% 80% at 50% 0%, rgba(142, 90, 168, 0.16) 0%, rgba(142, 90, 168, 0.03) 50%, transparent 75%)",
    collectionSlug: "air-signs",
  },
  {
    id: "water",
    title: "Water",
    vedic: "Jal · जल",
    scent: "Aquatic, deep and sensual",
    signNames: "Cancer · Scorpio · Pisces",
    signs: ["cancer", "scorpio", "pisces"],
    accentColor: "#1A7B8E",
    bgGlow:
      "radial-gradient(ellipse 120% 80% at 50% 0%, rgba(26, 123, 142, 0.16) 0%, rgba(26, 123, 142, 0.03) 50%, transparent 75%)",
    collectionSlug: "water-signs",
  },
];

/**
 * Haute-Parfumerie "Shop by Element" Section
 * - White/Warm Parchment editorial theme
 * - 4 Elemental Cards (Fire, Earth, Air, Water) with bespoke atmospheric glow
 * - Custom hairline vector glyphs for all 12 signs
 * - Direct navigation to each elemental Extrait collection
 */
export function ShopByElement() {
  return (
    <section
      aria-label="Shop by Element: Fire, Earth, Air, Water"
      className="relative bg-[#FAF7F2] text-[#1A1612] py-16 sm:py-20 lg:py-24 border-y border-[#E8E2D5] overflow-hidden"
    >
      {/* Editorial Astrological Compass Watermark */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-[-6%] top-1/2 -translate-y-1/2 size-[440px] opacity-[0.04] select-none"
      >
        <svg viewBox="0 0 200 200" className="size-full stroke-current" fill="none">
          <circle cx="100" cy="100" r="92" strokeWidth="0.5" />
          <circle cx="100" cy="100" r="80" strokeWidth="0.5" strokeDasharray="3 3" />
          <line x1="100" y1="0" x2="100" y2="200" strokeWidth="0.5" />
          <line x1="0" y1="100" x2="200" y2="100" strokeWidth="0.5" />
          <path
            d="M100 18 L105 95 L182 100 L105 105 L100 182 L95 105 L18 100 L95 95 Z"
            strokeWidth="0.75"
          />
        </svg>
      </div>

      <div className="mx-auto max-w-[1360px] px-4 sm:px-6 lg:px-10 relative z-10">
        {/* Section Editorial Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-10 border-b border-[#E8E2D5]">
          <Reveal>
            <div>
              <div className="inline-flex items-center gap-2 mb-2.5">
                <span className="size-1 rounded-full bg-[#73531F]" />
                <p className="font-caps text-xs sm:text-[13px] tracking-[0.24em] text-[#73531F] font-semibold uppercase">
                  SHOP BY ELEMENT
                </p>
                <span className="size-1 rounded-full bg-[#73531F]" />
              </div>
              <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-normal text-[#1A1612] tracking-tight">
                Fire, Earth, Air, Water
              </h2>
              <p className="mt-2.5 max-w-[65ch] text-sm sm:text-base text-[#3E3830] font-normal leading-relaxed">
                Twelve cosmic fragrance signatures curated by their classical elemental temperaments. Discover the accords formulated for your elemental energy.
              </p>
            </div>
          </Reveal>

          <Reveal delay={0.1}>
            <Link
              href="/collections"
              className="group inline-flex items-center gap-2 font-caps text-xs uppercase tracking-[0.18em] text-[#1A1612] font-medium hover:text-[#73531F] transition-colors"
            >
              <span>View All Collections</span>
              <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-1 text-[#73531F]" />
            </Link>
          </Reveal>
        </div>

        {/* 4 Elemental Cards Grid */}
        <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6">
          {ELEMENTS_DATA.map((elem, idx) => (
            <Reveal key={elem.id} delay={idx * 0.08}>
              <Link
                href={routes.collection(elem.collectionSlug)}
                className="group relative flex flex-col justify-between h-full rounded-2xl border border-[#E8E2D5] bg-white p-6 sm:p-7 lg:p-8 transition-all duration-400 ease-lux hover:-translate-y-1.5 hover:shadow-[0_20px_40px_rgba(0,0,0,0.08)] overflow-hidden"
              >
                {/* Luminous Top Radial Atmospheric Glow */}
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-x-0 top-0 h-40 opacity-75 transition-opacity duration-500 group-hover:opacity-100"
                  style={{ background: elem.bgGlow }}
                />

                {/* Card Header: 3 Astrological Glyphs */}
                <div className="relative z-10">
                  <div
                    className="flex items-center gap-2.5 mb-6"
                    style={{ color: elem.accentColor }}
                  >
                    {elem.signs.map((sign) => (
                      <span
                        key={sign}
                        className="flex size-8 items-center justify-center rounded-full border transition-transform duration-300 group-hover:scale-110 shadow-xs"
                        style={{
                          borderColor: `${elem.accentColor}30`,
                          backgroundColor: `${elem.accentColor}0A`,
                        }}
                      >
                        <Glyph sign={sign} className="size-4.5" label={false} />
                      </span>
                    ))}
                  </div>

                  {/* Title & Vedic Subtitle */}
                  <div className="flex items-baseline justify-between gap-2 mb-1.5">
                    <h3 className="font-display text-3xl sm:text-[34px] font-normal text-[#1A1612] transition-colors group-hover:text-[#73531F]">
                      {elem.title}
                    </h3>
                    <span className="font-rashi text-sm sm:text-[15px] text-[#73531F] font-normal">
                      {elem.vedic}
                    </span>
                  </div>

                  {/* Signs Included */}
                  <p className="font-caps text-xs uppercase tracking-[0.16em] text-[#73531F] font-medium mb-3">
                    {elem.signNames}
                  </p>

                  {/* Scent Description matching Image 1 */}
                  <p className="font-sans text-sm sm:text-base text-[#3E3830] font-normal leading-relaxed">
                    {elem.scent}
                  </p>
                </div>

                {/* Card Footer: Call To Action matching Image 1 */}
                <div
                  className="relative z-10 mt-8 pt-4 border-t border-[#E8E2D5] flex items-center justify-between font-caps text-[11px] uppercase tracking-[0.22em] font-semibold transition-colors duration-300"
                  style={{ color: elem.accentColor }}
                >
                  <span>SHOP {elem.title.toUpperCase()}</span>
                  <ArrowRight className="size-3.5 transition-transform duration-300 group-hover:translate-x-1.5" />
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

