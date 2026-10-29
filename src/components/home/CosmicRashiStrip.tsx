"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Sparkles, Compass } from "lucide-react";
import { ZODIAC, ZODIAC_SLUGS, type ZodiacSlug } from "@/config/zodiac";
import { ZodiacGoldGlyph } from "@/components/zodiac/ZodiacGoldGlyph";
import { Reveal } from "@/components/motion/Reveal";
import { routes } from "@/lib/routes";
import { cn } from "@/lib/cn";

const MONTH_NAMES = [
  "", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function formatDateRange(start: [number, number], end: [number, number]): string {
  return `${MONTH_NAMES[start[0]]} ${start[1]} – ${MONTH_NAMES[end[0]]} ${end[1]}`;
}

const RASHI_DATA: Record<
  ZodiacSlug,
  { devanagari: string; sanskrit: string; elementVedic: string }
> = {
  aries: { devanagari: "मेष", sanskrit: "Mesh", elementVedic: "Agni · Fire" },
  taurus: { devanagari: "वृषभ", sanskrit: "Vrishabh", elementVedic: "Prithvi · Earth" },
  gemini: { devanagari: "मिथुन", sanskrit: "Mithun", elementVedic: "Vayu · Air" },
  cancer: { devanagari: "कर्क", sanskrit: "Kark", elementVedic: "Jal · Water" },
  leo: { devanagari: "सिंह", sanskrit: "Simha", elementVedic: "Agni · Fire" },
  virgo: { devanagari: "कन्या", sanskrit: "Kanya", elementVedic: "Prithvi · Earth" },
  libra: { devanagari: "तुला", sanskrit: "Tula", elementVedic: "Vayu · Air" },
  scorpio: { devanagari: "वृश्चिक", sanskrit: "Vrishchik", elementVedic: "Jal · Water" },
  sagittarius: { devanagari: "धनु", sanskrit: "Dhanu", elementVedic: "Agni · Fire" },
  capricorn: { devanagari: "मकर", sanskrit: "Makar", elementVedic: "Prithvi · Earth" },
  aquarius: { devanagari: "कुम्भ", sanskrit: "Kumbh", elementVedic: "Vayu · Air" },
  pisces: { devanagari: "मीन", sanskrit: "Meen", elementVedic: "Jal · Water" },
};

export function CosmicRashiStrip() {
  // Default to Scorpio or Aries for luxury presentation
  const [selectedSlug, setSelectedSlug] = useState<ZodiacSlug>("scorpio");
  const signs = ZODIAC_SLUGS.map((slug) => ZODIAC[slug]);
  const activeSign = ZODIAC[selectedSlug];
  const activeMeta = RASHI_DATA[selectedSlug];

  return (
    <section
      id="cosmic-rashi-selector"
      aria-label="Cosmic Zodiac & Rashi Fragrance Selector"
      className="relative bg-[#FAF7F2] text-[#1A1612] py-16 sm:py-24 border-y border-[#E8E2D5] overflow-hidden"
    >
      {/* Editorial Astrological Compass Watermark */}
      <div
        aria-hidden
        className="pointer-events-none absolute right-[-6%] top-1/2 -translate-y-1/2 size-[460px] opacity-[0.05] select-none"
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

      <div className="mx-auto max-w-[1360px] px-4 sm:px-6 lg:px-10">
        {/* Section Editorial Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-12 border-b border-[#E8E2D5]">
          <Reveal>
            <div>
              <div className="inline-flex items-center gap-2 mb-2.5">
                <span className="size-1 rounded-full bg-[#73531F]" />
                <p className="font-caps text-xs sm:text-[13px] tracking-[0.24em] text-[#73531F] font-semibold uppercase">
                  THE TWELVE CELESTIAL HOUSES
                </p>
              </div>
              <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-normal text-[#1A1612] tracking-tight">
                Find Your Cosmic Fragrance
              </h2>
              <p className="mt-2.5 max-w-[65ch] text-sm sm:text-base text-[#423B33] font-normal leading-relaxed">
                Select your zodiac sign to reveal the bespoke Extrait de Parfum formulated
                for your ruling element, planetary temperament, and celestial energy.
              </p>
            </div>
          </Reveal>

          <Reveal delay={0.1}>
            <Link
              href="/zodiac"
              className="group inline-flex items-center gap-2 font-caps text-xs uppercase tracking-[0.18em] text-[#1A1612] font-medium hover:text-[#73531F] transition-colors"
            >
              <span>Explore All 12 Signs</span>
              <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-1 text-[#73531F]" />
            </Link>
          </Reveal>
        </div>

        {/* 12 Signs Circular Medallions Grid */}
        <Reveal delay={0.15}>
          <div
            role="tablist"
            aria-label="Zodiac signs selector"
            className="mt-10 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-12 gap-y-8 gap-x-2 sm:gap-x-4 items-start justify-items-center"
          >
            {signs.map((sign) => {
              const dateRange = formatDateRange(sign.start, sign.end);
              const meta = RASHI_DATA[sign.slug];
              const isSelected = selectedSlug === sign.slug;

              return (
                <button
                  key={sign.slug}
                  type="button"
                  role="tab"
                  aria-selected={isSelected}
                  aria-controls={`zodiac-panel-${sign.slug}`}
                  id={`zodiac-tab-${sign.slug}`}
                  onClick={() => setSelectedSlug(sign.slug)}
                  className="group flex flex-col items-center text-center cursor-pointer min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#73531F] focus-visible:ring-offset-2 focus-visible:ring-offset-[#FAF7F2] rounded-xl transition-all duration-200 w-full max-w-[96px]"
                >
                  {/* Premium Circular Medallion */}
                  <div
                    className={cn(
                      "relative mb-3.5 grid size-15 sm:size-16 lg:size-[68px] place-items-center rounded-full transition-all duration-300 select-none",
                      // Base Container: Deep Espresso / Obsidian with subtle champagne outline
                      "bg-gradient-to-b from-[#1C1714] via-[#14100E] to-[#0D0B0A]",
                      "border border-[#C9A96E]/35",
                      "shadow-[inset_0_1px_1px_rgba(255,245,225,0.12),0_4px_12px_rgba(0,0,0,0.32)]",
                      // Hover State: Delicate gold border illumination, slight scale up, restrained warm shadow
                      "group-hover:scale-[1.05] group-hover:border-[#E5CB8C]/90 group-hover:shadow-[inset_0_1px_2px_rgba(255,245,225,0.2),0_8px_20px_rgba(201,169,110,0.22)]",
                      // Selected State: Distinguished champagne gold double bezel & glow
                      isSelected &&
                        "scale-[1.06] border-[#D4AF37] ring-2 ring-[#D4AF37] ring-offset-2 ring-offset-[#FAF7F2] shadow-[inset_0_1px_2px_rgba(255,245,225,0.25),0_10px_24px_rgba(201,169,110,0.28)]"
                    )}
                  >
                    {/* Inner delicate jewelry hairline ring */}
                    <div
                      className={cn(
                        "pointer-events-none absolute inset-[3px] sm:inset-[3.5px] rounded-full border transition-colors duration-300",
                        isSelected
                          ? "border-[#D4AF37]/50"
                          : "border-[#C9A96E]/15 group-hover:border-[#C9A96E]/40"
                      )}
                    />

                    {/* Fine-line Engraved Gold Zodiac Glyph */}
                    <ZodiacGoldGlyph sign={sign.slug} isSelected={isSelected} />

                    {/* Micro-gem indicator dot for selected sign */}
                    {isSelected && (
                      <span
                        className="absolute -bottom-1 size-1.5 rounded-full bg-[#D4AF37] shadow-[0_0_8px_rgba(212,175,55,0.9)]"
                        aria-hidden
                      />
                    )}
                  </div>

                  {/* 1. English Zodiac Name */}
                  <span
                    className={cn(
                      "font-display text-sm sm:text-[14px] tracking-wide transition-colors duration-200",
                      isSelected
                        ? "text-[#73531F] font-semibold"
                        : "text-[#1A1612] font-medium group-hover:text-[#73531F]"
                    )}
                  >
                    {sign.name}
                  </span>

                  {/* 2. Hindi / Sanskrit Vedic Rashi Name */}
                  <span
                    className={cn(
                      "font-rashi text-xs sm:text-[12.5px] tracking-wider transition-colors duration-200 mt-0.5",
                      isSelected
                        ? "text-[#1A1612] font-semibold"
                        : "text-[#73531F] font-medium group-hover:text-[#1A1612]"
                    )}
                  >
                    {meta.devanagari} · {meta.sanskrit}
                  </span>

                  {/* 3. Astrological Date Range */}
                  <span className="mt-1 font-mono text-[11px] sm:text-xs text-[#5C554D] tracking-tight leading-none">
                    {dateRange}
                  </span>
                </button>
              );
            })}
          </div>
        </Reveal>

        {/* Selected Sign Signature Fragrance Showcase Panel */}
        <Reveal delay={0.25}>
          <div
            id={`zodiac-panel-${activeSign.slug}`}
            role="tabpanel"
            aria-labelledby={`zodiac-tab-${activeSign.slug}`}
            className="mt-12 rounded-2xl bg-[#FCFAF6] border border-[#E3DCB8] p-6 sm:p-8 lg:p-10 shadow-[0_4px_24px_rgba(140,113,69,0.06)] relative overflow-hidden"
          >
            {/* Subtle Gold Ambient Corner Flare */}
            <div
              aria-hidden
              className="pointer-events-none absolute top-0 right-0 size-64 bg-radial from-[#C9A96E]/12 to-transparent blur-2xl"
            />

            <div className="relative grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              {/* Left Column: Sign Identity & Perfume Details */}
              <div className="lg:col-span-7 flex flex-col justify-between">
                <div>
                  {/* Eyebrow: Element & Vedic Identity */}
                  <div className="flex flex-wrap items-center gap-2 text-xs text-[#73531F] font-medium tracking-wider mb-2.5">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FAF0D7] border border-[#E0D1B0] text-[#7A5F35] font-caps text-xs uppercase font-semibold">
                      <Sparkles className="size-2.5" />
                      {activeMeta.elementVedic}
                    </span>
                    <span className="text-[#B3A698]">·</span>
                    <span className="font-caps text-xs tracking-wider uppercase text-[#5C554D]">
                      Ruled by {activeSign.rulingPlanet}
                    </span>
                    <span className="text-[#B3A698]">·</span>
                    <span className="font-caps text-[11px] tracking-widest uppercase text-[#5C554D]">
                      Gemstone: {activeSign.gemstone}
                    </span>
                  </div>

                  {/* Fragrance Title & Sign Heading */}
                  <h3 className="font-display text-2xl sm:text-3xl lg:text-4xl font-normal text-[#1A1612] tracking-tight">
                    {activeSign.fragrance.name}
                    <span className="block text-sm sm:text-base font-sans font-light text-[#7A7268] mt-1">
                      Bespoke Extrait de Parfum for {activeSign.name} ({activeMeta.devanagari} · {activeMeta.sanskrit})
                    </span>
                  </h3>

                  {/* Fragrance Tagline */}
                  <p className="mt-3 text-sm sm:text-base text-[#2E2822] italic font-serif leading-relaxed border-l-2 border-[#73531F]/50 pl-3.5">
                    &ldquo;{activeSign.fragrance.tagline}&rdquo;
                  </p>
                </div>

                {/* Olfactory Pyramid (Top, Heart, Base) */}
                <div className="mt-6 pt-5 border-t border-[#E8E2D5] grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <p className="text-xs font-caps uppercase tracking-[0.16em] text-[#73531F] font-semibold mb-1">
                      Top Notes
                    </p>
                    <p className="text-sm sm:text-base text-[#1A1612] font-medium leading-relaxed">
                      {activeSign.fragrance.notes.top.map((n) => n.name).join(", ")}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-caps uppercase tracking-[0.16em] text-[#73531F] font-semibold mb-1">
                      Heart Notes
                    </p>
                    <p className="text-sm sm:text-base text-[#1A1612] font-medium leading-relaxed">
                      {activeSign.fragrance.notes.heart.map((n) => n.name).join(", ")}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-caps uppercase tracking-[0.16em] text-[#73531F] font-semibold mb-1">
                      Base Notes
                    </p>
                    <p className="text-sm sm:text-base text-[#1A1612] font-medium leading-relaxed">
                      {activeSign.fragrance.notes.base.map((n) => n.name).join(", ")}
                    </p>
                  </div>
                </div>

                {/* Core Astrological Traits */}
                <div className="mt-5 flex flex-wrap items-center gap-1.5">
                  <span className="text-xs font-caps uppercase tracking-wider text-[#5C554D] mr-1">
                    Essence:
                  </span>
                  {activeSign.traits.map((trait) => (
                    <span
                      key={trait}
                      className="text-xs px-3 py-1 rounded-md bg-[#F2EDE4] text-[#332C24] font-medium"
                    >
                      {trait}
                    </span>
                  ))}
                </div>
              </div>

              {/* Right Column: Luxury Action Portal */}
              <div className="lg:col-span-5 flex flex-col justify-center items-start lg:items-end border-t lg:border-t-0 lg:border-l border-[#E8E2D5] pt-6 lg:pt-0 lg:pl-8">
                <div className="w-full max-w-sm flex flex-col gap-3.5">
                  {/* Primary CTA: Experience Extrait */}
                  <Link
                    href={routes.product(activeSign.fragrance.slug)}
                    className="w-full min-h-[48px] inline-flex items-center justify-center gap-2 rounded-full bg-[#1A1612] text-[#FAF7F2] hover:bg-[#73531F] px-6 py-3.5 text-xs sm:text-sm font-medium tracking-[0.14em] uppercase transition-all duration-200 shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 active:scale-98 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#73531F] focus-visible:ring-offset-2 group"
                  >
                    <span>Experience {activeSign.fragrance.name}</span>
                    <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                  </Link>

                  {/* Secondary CTA: Explore Sign Profile */}
                  <Link
                    href={routes.sign(activeSign.slug)}
                    className="w-full min-h-[44px] inline-flex items-center justify-center gap-2 rounded-full bg-white border border-[#D5CCA8] text-[#1A1612] hover:border-[#73531F] hover:text-[#73531F] hover:bg-[#FAF7F2] px-6 py-3 text-xs tracking-[0.12em] uppercase font-medium transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 active:scale-98 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#73531F] focus-visible:ring-offset-2"
                  >
                    <Compass className="size-3.5 text-[#73531F]" />
                    <span>View {activeSign.name} Cosmic Guide</span>
                  </Link>

                  <p className="text-xs text-[#5C554D] text-center lg:text-right font-normal">
                    28% Extrait de Parfum concentration · 50ml flacon · Free shipping
                  </p>
                </div>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
