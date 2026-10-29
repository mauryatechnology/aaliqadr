import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Compass } from "lucide-react";
import { ELEMENT_INFO, ZODIAC, type ZodiacSlug, type Element } from "@/config/zodiac";
import { formatSignDates } from "@/lib/zodiac-math";
import { breadcrumbLd, collectionPageLd, JsonLd } from "@/lib/jsonld";
import { Reveal } from "@/components/motion/Reveal";
import { BottleArt } from "@/components/zodiac/BottleArt";
import { ZodiacGoldGlyph } from "@/components/zodiac/ZodiacGoldGlyph";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { routes } from "@/lib/routes";

export const metadata: Metadata = {
  title: "Twelve Signs. Twelve Olfactory Universes | Zodiac Perfume Guide | Aaliqadr",
  description:
    "Explore all twelve signs of the celestial zodiac and Vedic rashis paired with luxury Extrait de Parfum fragrances. Composed around Fire, Earth, Air, and Water elements with 28% oil concentration.",
  keywords: [
    "zodiac perfume guide",
    "12 rashi perfumes",
    "astrology fragrance guide",
    "fire element perfume",
    "earth element perfume",
    "air element perfume",
    "water element perfume",
    "perfume by rashi",
    "luxury astrological perfumes",
  ],
  alternates: { canonical: "/zodiac" },
  openGraph: {
    title: "Twelve Signs. Twelve Olfactory Universes | Aaliqadr",
    description: "Twelve signs, twelve signatures. Explore luxury Extrait de Parfum crafted for every rashi.",
    url: "/zodiac",
    type: "website",
  },
};

const RASHI_DATA: Record<
  ZodiacSlug,
  { devanagari: string; sanskrit: string; elementVedic: string; rulingVedic: string }
> = {
  aries: { devanagari: "मेष", sanskrit: "Mesh", elementVedic: "Agni · Fire", rulingVedic: "Mangal · Mars" },
  taurus: { devanagari: "वृषभ", sanskrit: "Vrishabh", elementVedic: "Prithvi · Earth", rulingVedic: "Shukra · Venus" },
  gemini: { devanagari: "मिथुन", sanskrit: "Mithun", elementVedic: "Vayu · Air", rulingVedic: "Budh · Mercury" },
  cancer: { devanagari: "कर्क", sanskrit: "Kark", elementVedic: "Jal · Water", rulingVedic: "Chandra · Moon" },
  leo: { devanagari: "सिंह", sanskrit: "Simha", elementVedic: "Agni · Fire", rulingVedic: "Surya · Sun" },
  virgo: { devanagari: "कन्या", sanskrit: "Kanya", elementVedic: "Prithvi · Earth", rulingVedic: "Budh · Mercury" },
  libra: { devanagari: "तुला", sanskrit: "Tula", elementVedic: "Vayu · Air", rulingVedic: "Shukra · Venus" },
  scorpio: { devanagari: "वृश्चिक", sanskrit: "Vrishchik", elementVedic: "Jal · Water", rulingVedic: "Mangal & Ketu" },
  sagittarius: { devanagari: "धनु", sanskrit: "Dhanu", elementVedic: "Agni · Fire", rulingVedic: "Brihaspati · Jupiter" },
  capricorn: { devanagari: "मकर", sanskrit: "Makar", elementVedic: "Prithvi · Earth", rulingVedic: "Shani · Saturn" },
  aquarius: { devanagari: "कुम्भ", sanskrit: "Kumbh", elementVedic: "Vayu · Air", rulingVedic: "Shani & Rahu" },
  pisces: { devanagari: "मीन", sanskrit: "Meen", elementVedic: "Jal · Water", rulingVedic: "Brihaspati · Jupiter" },
};

const ELEMENT_EDITORIAL: Record<
  Element,
  {
    vedicName: string;
    tagline: string;
    rulingPlanets: string;
    olfactoryAccords: string;
  }
> = {
  fire: {
    vedicName: "AGNI · अग्नि · FIRE ELEMENT",
    tagline: "The Solar Flame · Courage, Passion & Sovereign Radiance",
    rulingPlanets: "Surya · Mangal · Brihaspati",
    olfactoryAccords: "Smoked Saffron, Solar Amber, Ceylon Cinnamon & Royal Mysore Sandalwood",
  },
  earth: {
    vedicName: "PRITHVI · पृथ्वी · EARTH ELEMENT",
    tagline: "The Ancient Earth · Sensual Grounding, Luxury & Enduring Legacy",
    rulingPlanets: "Shukra · Budh · Shani",
    olfactoryAccords: "Vetiver Bourbon, Cedar Resin, Petrichor & Creamy Almond Blossom",
  },
  air: {
    vedicName: "VAYU · वायु · AIR ELEMENT",
    tagline: "The Celestial Breath · Intellect, Clarity & Ethereal Spirit",
    rulingPlanets: "Budh · Shukra · Uranus",
    olfactoryAccords: "Ozonic Violet Leaf, Calabrian Bergamot, Neroli, White Tea & Ambergris",
  },
  water: {
    vedicName: "JAL · जल · WATER ELEMENT",
    tagline: "The Oceanic Depths · Intuition, Emotion & Mystical Metamorphosis",
    rulingPlanets: "Chandra · Mangal · Neptune",
    olfactoryAccords: "Sea Salt Driftwood, Night Blooming Jasmine, Black Plum & Frankincense",
  },
};

export default function ZodiacIndexPage() {
  return (
    <div className="relative overflow-clip bg-[#060508] text-ivory">
      {/* ── 1. ULTRA-LUXURY BLACK HERO ── */}
      <section className="relative isolate min-h-[72vh] flex flex-col justify-center items-center overflow-clip pt-28 pb-16 sm:pt-36 sm:pb-20 text-center bg-[#060508]">
        {/* Soft amber / gold atmospheric glow */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 flex items-center justify-center overflow-hidden"
        >
          <div className="absolute h-[550px] w-[550px] sm:h-[700px] sm:w-[700px] rounded-full bg-gold/[0.12] blur-[150px]" />
          <div className="absolute inset-0 bg-[radial-gradient(#C9A96E_1px,transparent_1px)] [background-size:72px_72px] opacity-15" />
        </div>

        <div className="mx-auto flex w-full max-w-[1360px] flex-col items-center px-4 sm:px-6">
          <Reveal>
            <p className="font-caps text-xs sm:text-[13px] tracking-[0.28em] text-gold font-medium mb-4 sm:mb-6 flex items-center justify-center gap-2">
              <span className="text-gold/80 text-[10px]">✦</span>
              <span>THE CELESTIAL ZODIAC · 12 RASHIS · 28% EXTRAIT DE PARFUM</span>
              <span className="text-gold/80 text-[10px]">✦</span>
            </p>
          </Reveal>

          <Reveal delay={0.08}>
            <h1 className="font-display text-4xl sm:text-6xl lg:text-7xl font-light leading-[1.08] tracking-tight max-w-5xl text-ivory">
              Twelve Signs. Twelve Olfactory Universes.{" "}
              <span className="italic font-light text-[#E0C892]">
                Crafted for your rashi.
              </span>
            </h1>
          </Reveal>

          <Reveal delay={0.16}>
            <p className="mt-5 sm:mt-6 max-w-2xl text-sm sm:text-base text-muted font-light leading-relaxed mx-auto">
              Explore the twelve celestial Extrait de Parfum signatures, grouped by the four classical elements of Fire, Earth, Air, and Water. Each bespoke flacon captures the element, planetary ruler, and spiritual essence of its sign.
            </p>
          </Reveal>

          {/* Western & Vedic Unified Badge */}
          <Reveal delay={0.22}>
            <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold/[0.06] px-4 sm:px-6 py-2 text-xs text-gold/90">
              <span className="size-1.5 rounded-full bg-gold animate-pulse" />
              <span className="font-caps uppercase tracking-[0.18em]">
                Western Tropical Sun Signs & Vedic Sidereal Chandra Rashis · Unified Haute Parfumerie
              </span>
            </div>
          </Reveal>

          {/* Quick Jump Element Navigation Buttons */}
          <Reveal delay={0.28} className="mt-8 flex flex-wrap items-center justify-center gap-2.5 sm:gap-4">
            <a
              href="#element-fire"
              className="inline-flex min-h-[42px] items-center gap-1.5 rounded-full border border-gold/35 bg-surface/80 px-5 py-2 font-caps text-xs uppercase tracking-[0.16em] text-ivory hover:border-gold hover:text-gold transition-all"
            >
              <span>Agni · Fire</span>
            </a>
            <a
              href="#element-earth"
              className="inline-flex min-h-[42px] items-center gap-1.5 rounded-full border border-gold/35 bg-surface/80 px-5 py-2 font-caps text-xs uppercase tracking-[0.16em] text-ivory hover:border-gold hover:text-gold transition-all"
            >
              <span>Prithvi · Earth</span>
            </a>
            <a
              href="#element-air"
              className="inline-flex min-h-[42px] items-center gap-1.5 rounded-full border border-gold/35 bg-surface/80 px-5 py-2 font-caps text-xs uppercase tracking-[0.16em] text-ivory hover:border-gold hover:text-gold transition-all"
            >
              <span>Vayu · Air</span>
            </a>
            <a
              href="#element-water"
              className="inline-flex min-h-[42px] items-center gap-1.5 rounded-full border border-gold/35 bg-surface/80 px-5 py-2 font-caps text-xs uppercase tracking-[0.16em] text-ivory hover:border-gold hover:text-gold transition-all"
            >
              <span>Jal · Water</span>
            </a>
            <Link
              href="/find-my-sign"
              className="inline-flex min-h-[42px] items-center gap-2 rounded-full border border-gold bg-gold px-6 py-2 font-caps text-xs uppercase tracking-[0.18em] text-obsidian font-semibold shadow-[0_0_18px_rgba(201,169,110,0.35)] hover:bg-[#E5CB8C] transition-all"
            >
              <Compass className="size-3.5" />
              <span>Find My Sign</span>
            </Link>
          </Reveal>
        </div>
      </section>

      {/* ── 2. WHITE / WARM-PARCHMENT SECTION: FIRE & EARTH ELEMENTS ── */}
      <section className="relative bg-[#FAF7F2] text-[#17130F] py-16 sm:py-24 border-y border-[#E8E2D5] overflow-hidden">
        {/* Subtle champagne ambient lighting */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10"
        >
          <div className="absolute right-[5%] top-1/3 h-[500px] w-[500px] rounded-full bg-[#73531F]/[0.05] blur-[120px]" />
        </div>

        <div className="mx-auto max-w-[1360px] px-4 sm:px-6 lg:px-10 space-y-20 sm:space-y-24">
          {/* Fire Signs Block */}
          <ElementParchmentBlock element="fire" />

          {/* Earth Signs Block */}
          <ElementParchmentBlock element="earth" />
        </div>
      </section>

      {/* ── 3. DEEP OBSIDIAN BLACK SECTION: AIR & WATER ELEMENTS ── */}
      <section className="relative bg-[#060508] text-ivory py-16 sm:py-24 overflow-hidden border-b border-white/10">
        {/* Soft cosmic glow */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10"
        >
          <div className="absolute left-[10%] top-1/2 -translate-y-1/2 h-[550px] w-[550px] rounded-full bg-gold/[0.07] blur-[140px]" />
        </div>

        <div className="mx-auto max-w-[1360px] px-4 sm:px-6 lg:px-10 space-y-20 sm:space-y-24">
          {/* Air Signs Block */}
          <ElementObsidianBlock element="air" />

          {/* Water Signs Block */}
          <ElementObsidianBlock element="water" />
        </div>
      </section>

      {/* ── 4. WHITE / WARM-PARCHMENT SECTION: ASTROLOGICAL SCIENCE ── */}
      <section className="relative bg-[#FAF7F2] text-[#17130F] py-16 sm:py-24 border-b border-[#E8E2D5] overflow-hidden">
        <div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-10">
          <Reveal className="text-center max-w-3xl mx-auto mb-14 sm:mb-16">
            <p className="font-caps text-xs sm:text-[13px] tracking-[0.28em] text-[#73531F] font-semibold uppercase mb-3 flex items-center justify-center gap-2">
              <span className="text-[#73531F] text-[10px]">✦</span>
              <span>THE PHILOSOPHY OF AALIQADR</span>
              <span className="text-[#73531F] text-[10px]">✦</span>
            </p>
            <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-normal text-[#17130F] tracking-tight">
              Why Your Sign Governs Your Sillage
            </h2>
            <p className="mt-4 text-sm sm:text-base text-[#423B33] font-normal leading-relaxed">
              Astrology is not just symbolism; it is an elemental blueprint of body chemistry, spiritual aura, and olfactive resonance.
            </p>
          </Reveal>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
            <Reveal delay={0.08}>
              <div className="h-full rounded-2xl border border-[#E8E2D5] bg-white p-7 sm:p-8 shadow-[0_4px_20px_rgba(23,19,15,0.04)]">
                <p className="font-display text-2xl text-[#73531F] font-serif mb-3">I</p>
                <h3 className="font-display text-xl sm:text-2xl font-normal text-[#17130F] mb-2.5">
                  Western Sun vs Vedic Moon
                </h3>
                <p className="text-xs sm:text-sm text-[#5A5046] font-normal leading-relaxed">
                  Your Sun sign represents your conscious personality and social identity, while your Vedic Chandra Rashi embodies your emotional subconscious and core intuition. Our fragrances unite both traditions.
                </p>
              </div>
            </Reveal>

            <Reveal delay={0.16}>
              <div className="h-full rounded-2xl border border-[#E8E2D5] bg-white p-7 sm:p-8 shadow-[0_4px_20px_rgba(23,19,15,0.04)]">
                <p className="font-display text-2xl text-[#73531F] font-serif mb-3">II</p>
                <h3 className="font-display text-xl sm:text-2xl font-normal text-[#17130F] mb-2.5">
                  28% Pure Extrait Concentration
                </h3>
                <p className="text-xs sm:text-sm text-[#5A5046] font-normal leading-relaxed">
                  While commercial Eau de Parfum averages 12–18%, Aaliqadr is composed at an opulent 28% oil concentration. This provides 12+ hours of majestic longevity without sharp synthetic diffusers.
                </p>
              </div>
            </Reveal>

            <Reveal delay={0.24}>
              <div className="h-full rounded-2xl border border-[#E8E2D5] bg-white p-7 sm:p-8 shadow-[0_4px_20px_rgba(23,19,15,0.04)]">
                <p className="font-display text-2xl text-[#73531F] font-serif mb-3">III</p>
                <h3 className="font-display text-xl sm:text-2xl font-normal text-[#17130F] mb-2.5">
                  180 Days Slow Cellar Aging
                </h3>
                <p className="text-xs sm:text-sm text-[#5A5046] font-normal leading-relaxed">
                  Every batch of Aaliqadr perfume undergoes cold, dark-chamber maturation for half a year in temperature-controlled ateliers, marrying wild florals with aged woods and natural resins.
                </p>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── 5. BLACK DISCOVERY COFFRET & SIGN FINDER CTA ── */}
      <section className="relative bg-[#060508] py-16 sm:py-24 text-ivory overflow-hidden">
        <div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-10">
          <Reveal>
            <div className="relative overflow-hidden rounded-2xl border border-gold/30 bg-[#0E0C12] p-8 sm:p-12 lg:p-14 shadow-[0_25px_60px_rgba(0,0,0,0.8)] flex flex-col md:flex-row items-center justify-between gap-8">
              <div
                aria-hidden
                className="pointer-events-none absolute -right-20 -top-20 size-80 rounded-full bg-gold/10 blur-[80px]"
              />
              <div className="space-y-3 text-center md:text-left max-w-xl">
                <p className="font-caps text-xs sm:text-[13px] tracking-[0.24em] text-gold font-medium uppercase flex items-center justify-center md:justify-start gap-2">
                  <span className="text-[9px]">✦</span>
                  <span>THE DISCOVERY JOURNEY</span>
                </p>
                <h3 className="font-display text-3xl sm:text-4xl md:text-5xl font-light text-ivory">
                  Sample every celestial signature
                </h3>
                <p className="font-sans text-xs sm:text-sm text-ivory/80 font-light leading-relaxed">
                  Before committing to a full 50ml or 100ml flacon, experience the complete twelve-sign universe in our handcrafted miniature coffret, formulated with the identical 28% concentration.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row items-center gap-4 shrink-0">
                <ButtonLink href={routes.product("zodiac-discovery-coffret")} variant="primary" size="lg">
                  Explore Coffret (12 x 2ml)
                </ButtonLink>
                <ButtonLink href="/find-my-sign" variant="secondary" size="lg">
                  Find My Sign Calculator
                </ButtonLink>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* SEO Schema */}
      <JsonLd
        data={breadcrumbLd([
          { name: "Home", path: "/" },
          { name: "The Zodiac", path: "/zodiac" },
        ])}
      />
      <JsonLd
        data={collectionPageLd({
          name: "The Zodiac Signatures",
          description: "Twelve luxury Extrait de Parfum fragrances composed for the twelve signs of the zodiac and Vedic rashis.",
          path: "/zodiac",
          items: Object.values(ZODIAC).map((s) => ({
            name: `${s.name} (${s.rashi}): ${s.fragrance.name}`,
            path: `/zodiac/${s.slug}`,
          })),
        })}
      />
    </div>
  );
}

/**
 * Element Block in Warm Parchment White (#FAF7F2)
 * Used for Fire and Earth elements
 */
function ElementParchmentBlock({ element }: { element: Element }) {
  const info = ELEMENT_INFO[element];
  const editorial = ELEMENT_EDITORIAL[element];

  return (
    <div id={`element-${element}`} className="scroll-mt-24">
      {/* Editorial Element Header */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-8 border-b border-[#E8E2D5] mb-10">
        <div>
          <p className="font-caps text-[11px] sm:text-xs tracking-[0.26em] text-[#73531F] font-semibold uppercase mb-2 flex items-center gap-2">
            <span className="size-1 rounded-full bg-[#73531F]" />
            <span>{editorial.vedicName}</span>
          </p>
          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-normal text-[#17130F] tracking-tight">
            {info.label} Signs
          </h2>
          <p className="mt-2 text-xs sm:text-sm text-[#5A5046] font-normal max-w-2xl">
            {editorial.tagline} · Ruling planets: <span className="font-medium text-[#17130F]">{editorial.rulingPlanets}</span>.
          </p>
        </div>

        <div className="rounded-xl border border-[#E8E2D5] bg-white/80 p-4 max-w-md shadow-xs">
          <p className="font-caps text-[10px] tracking-[0.2em] text-[#73531F] uppercase font-semibold mb-1">
            Olfactory Accords
          </p>
          <p className="font-serif italic text-xs sm:text-[13px] text-[#332B24] leading-relaxed">
            &ldquo;{editorial.olfactoryAccords}&rdquo;
          </p>
        </div>
      </div>

      {/* Grid of Signs in White/Parchment Style */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
        {info.signs.map((slug, i) => {
          const s = ZODIAC[slug];
          const meta = RASHI_DATA[slug];

          return (
            <Reveal key={slug} delay={i * 0.08} className="h-full">
              <div className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-[#E8E2D5] bg-white p-6 sm:p-7 shadow-[0_4px_24px_rgba(23,19,15,0.04)] transition-all duration-500 hover:-translate-y-1 hover:border-[#C9A96E] hover:shadow-[0_16px_36px_rgba(23,19,15,0.08)]">
                {/* Top: Sign Name, Sanskrit Rashi, and Dates */}
                <div className="flex items-start justify-between gap-3 pb-5 border-b border-[#F0EBE0]">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-caps text-xs tracking-[0.2em] text-[#73531F] font-semibold uppercase">
                        {s.name}
                      </p>
                      <span className="font-rashi text-sm text-[#17130F] font-medium">
                        ({meta.devanagari} · {meta.sanskrit})
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] text-[#6A5E52] font-normal">
                      {formatSignDates(s)}
                    </p>
                  </div>
                  <ZodiacGoldGlyph sign={slug} className="size-7 shrink-0" />
                </div>

                {/* Middle: Bottle Artwork Preview */}
                <div className="relative my-6 aspect-[4/3] w-full flex items-center justify-center overflow-hidden rounded-xl bg-[#FAF7F2] p-4">
                  <div className="h-full w-auto transition-transform duration-500 group-hover:scale-105">
                    <BottleArt sign={slug} className="h-full w-auto max-h-[140px] object-contain" />
                  </div>
                </div>

                {/* Bottom: Signature Perfume Details */}
                <div className="mt-auto space-y-3 pt-2">
                  <div>
                    <p className="font-caps text-[10px] tracking-[0.2em] text-[#73531F] uppercase font-medium">
                      Extrait Signature
                    </p>
                    <h3 className="font-display text-xl text-[#17130F] font-normal group-hover:text-[#73531F] transition-colors">
                      {s.fragrance.name}
                    </h3>
                  </div>

                  <p className="text-xs text-[#5A5046] font-normal line-clamp-2 leading-relaxed">
                    {s.fragrance.tagline}
                  </p>

                  <div className="pt-3 border-t border-[#F0EBE0] flex items-center justify-between">
                    <span className="font-sans text-xs font-semibold text-[#17130F]">
                      ₹1,199 <span className="font-normal text-[11px] text-[#73531F]">/ 50ml</span>
                    </span>
                    <Link
                      href={routes.sign(slug)}
                      className="inline-flex items-center gap-1.5 font-caps text-[11px] uppercase tracking-[0.16em] text-[#73531F] font-semibold hover:text-[#17130F] transition-colors"
                    >
                      <span>Explore</span>
                      <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-1" />
                    </Link>
                  </div>
                </div>
              </div>
            </Reveal>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Element Block in Deep Obsidian Black (#060508 / #07060A)
 * Used for Air and Water elements
 */
function ElementObsidianBlock({ element }: { element: Element }) {
  const info = ELEMENT_INFO[element];
  const editorial = ELEMENT_EDITORIAL[element];

  return (
    <div id={`element-${element}`} className="scroll-mt-24">
      {/* Editorial Element Header */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-8 border-b border-white/10 mb-10">
        <div>
          <p className="font-caps text-[11px] sm:text-xs tracking-[0.26em] text-gold font-medium uppercase mb-2 flex items-center gap-2">
            <span className="size-1 rounded-full bg-gold" />
            <span>{editorial.vedicName}</span>
          </p>
          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-light text-ivory tracking-tight">
            {info.label} Signs
          </h2>
          <p className="mt-2 text-xs sm:text-sm text-muted font-normal max-w-2xl">
            {editorial.tagline} · Ruling planets: <span className="text-ivory font-medium">{editorial.rulingPlanets}</span>.
          </p>
        </div>

        <div className="rounded-xl border border-gold/25 bg-[#0E0C12] p-4 max-w-md shadow-lg">
          <p className="font-caps text-[10px] tracking-[0.2em] text-gold uppercase font-medium mb-1">
            Olfactory Accords
          </p>
          <p className="font-serif italic text-xs sm:text-[13px] text-ivory/90 leading-relaxed">
            &ldquo;{editorial.olfactoryAccords}&rdquo;
          </p>
        </div>
      </div>

      {/* Grid of Signs in Obsidian Style */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
        {info.signs.map((slug, i) => {
          const s = ZODIAC[slug];
          const meta = RASHI_DATA[slug];

          return (
            <Reveal key={slug} delay={i * 0.08} className="h-full">
              <div className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0E0C12] p-6 sm:p-7 shadow-[0_12px_32px_rgba(0,0,0,0.5)] transition-all duration-500 hover:-translate-y-1 hover:border-gold/50 hover:shadow-[0_20px_44px_rgba(0,0,0,0.7)]">
                {/* Top: Sign Name, Sanskrit Rashi, and Dates */}
                <div className="flex items-start justify-between gap-3 pb-5 border-b border-white/10">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-caps text-xs tracking-[0.2em] text-gold font-medium uppercase">
                        {s.name}
                      </p>
                      <span className="font-rashi text-sm text-ivory font-normal">
                        ({meta.devanagari} · {meta.sanskrit})
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] text-muted font-normal">
                      {formatSignDates(s)}
                    </p>
                  </div>
                  <ZodiacGoldGlyph sign={slug} className="size-7 shrink-0" />
                </div>

                {/* Middle: Bottle Artwork Preview */}
                <div className="relative my-6 aspect-[4/3] w-full flex items-center justify-center overflow-hidden rounded-xl bg-white/[0.02] p-4 border border-white/5">
                  <div className="h-full w-auto transition-transform duration-500 group-hover:scale-105">
                    <BottleArt sign={slug} className="h-full w-auto max-h-[140px] object-contain" />
                  </div>
                </div>

                {/* Bottom: Signature Perfume Details */}
                <div className="mt-auto space-y-3 pt-2">
                  <div>
                    <p className="font-caps text-[10px] tracking-[0.2em] text-gold uppercase font-medium">
                      Extrait Signature
                    </p>
                    <h3 className="font-display text-xl text-ivory font-light group-hover:text-gold transition-colors">
                      {s.fragrance.name}
                    </h3>
                  </div>

                  <p className="text-xs text-muted font-light line-clamp-2 leading-relaxed">
                    {s.fragrance.tagline}
                  </p>

                  <div className="pt-3 border-t border-white/10 flex items-center justify-between">
                    <span className="font-sans text-xs font-medium text-ivory">
                      ₹1,199 <span className="font-normal text-[11px] text-gold">/ 50ml</span>
                    </span>
                    <Link
                      href={routes.sign(slug)}
                      className="inline-flex items-center gap-1.5 font-caps text-[11px] uppercase tracking-[0.16em] text-gold font-medium hover:text-ivory transition-colors"
                    >
                      <span>Explore</span>
                      <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-1" />
                    </Link>
                  </div>
                </div>
              </div>
            </Reveal>
          );
        })}
      </div>
    </div>
  );
}
