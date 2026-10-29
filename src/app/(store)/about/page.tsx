import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Sparkles, Compass, ShieldCheck } from "lucide-react";
import { ELEMENT_INFO, ELEMENTS, ZODIAC, SIGNS, type Element } from "@/config/zodiac";
import { routes } from "@/lib/routes";
import { breadcrumbLd, JsonLd, organizationLd } from "@/lib/jsonld";
import { Reveal } from "@/components/motion/Reveal";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { ZodiacGoldGlyph } from "@/components/zodiac/ZodiacGoldGlyph";
import { mark, wordmark } from "@/components/brand/logo-paths";

export const metadata: Metadata = {
  title: "Our Craft & Philosophy: Luxury Zodiac Perfumery | Aaliqadr",
  description:
    "Discover the house of Aaliqadr. How we combine classical Indian Vedic astrology, celestial elements, and French Haute Parfumerie to craft 28% Extrait de Parfum signatures.",
  keywords: [
    "about aaliqadr",
    "luxury perfume brand India",
    "zodiac perfume maker",
    "artisanal extrait de parfum",
    "niche fragrance house India",
    "28 percent oil concentration",
    "kannauj oud french perfumery",
  ],
  alternates: { canonical: "/about" },
  openGraph: {
    title: "Our Craft & Philosophy: Luxury Zodiac Perfumery | Aaliqadr",
    description: "High esteem, in a single drop. Discover the philosophy behind Aaliqadr zodiac fragrances.",
    url: "/about",
    type: "website",
  },
};

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

const CRAFT_PILLARS = [
  {
    num: "I",
    title: "28% Master Extrait",
    desc: "The pinnacle tier in niche haute perfumerie. High oil concentration ensures 12+ hours of continuous presence with a dignified, non-invasive sillage.",
  },
  {
    num: "II",
    title: "Dual Celestial Astrologies",
    desc: "We bridge Western tropical sun signs with ancient Vedic sidereal moon rashis, composing olfactive profiles that resonate with both your conscious identity and inner emotional nature.",
  },
  {
    num: "III",
    title: "Terroir of Grasse & Kannauj",
    desc: "Crafted by marrying Grasse extraction techniques with revered Indian noble botanicals: Kannauj hydro-distilled Damask rose, Mysore sandalwood, and wild-harvested desert saffron.",
  },
  {
    num: "IV",
    title: "180 Days Slow Maceration",
    desc: "Every batch is aged in temperature-controlled dark chambers for six months, allowing natural resins and volatile florals to naturally meld without artificial stabilizers.",
  },
];

const ELEMENT_DETAILS: Record<
  Element,
  {
    sanskrit: string;
    accent: string;
    traits: string;
    keyNotes: string;
  }
> = {
  fire: {
    sanskrit: "तेजस् · Agni",
    accent: "#E0533C",
    traits: "Dynamic · Solar · Courageous",
    keyNotes: "Desert Saffron, Smoked Oud, Solar Amber, Pink Peppercorn",
  },
  earth: {
    sanskrit: "पृथ्वी · Prithvi",
    accent: "#3E8A5E",
    traits: "Grounded · Sensual · Enduring",
    keyNotes: "Mysore Sandalwood, Vetiver Bourbon, Cedar Resin, Petrichor",
  },
  air: {
    sanskrit: "वायु · Vayu",
    accent: "#D4A843",
    traits: "Intellectual · Luminous · Free",
    keyNotes: "Sparkling Bergamot, Solar Aldehydes, White Neroli, Incense",
  },
  water: {
    sanskrit: "जल · Varuna",
    accent: "#3B82A6",
    traits: "Intuitive · Oceanic · Mysterious",
    keyNotes: "Coastal Ambergris, Blue Lotus, Crushed Myrrh, Deep Sea Moss",
  },
};

export default function AboutPage() {
  return (
    <div className="relative overflow-clip">

      {/* ═══════════════════════════════════════════════════════════════════
          SECTION 1 · GRAND HERO & LORE — 🌌 DEEP OBSIDIAN BLACK (#060508)
          ═══════════════════════════════════════════════════════════════════ */}
      <section className="grain relative isolate flex min-h-[85vh] flex-col justify-center overflow-clip bg-[#060508] text-ivory pt-24 pb-16 sm:pt-32 sm:pb-20">
        {/* Soft golden nebula ambient glow */}
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
          <div
            className="absolute left-[15%] top-1/2 -translate-y-1/2 h-[550px] w-[550px] rounded-full blur-[140px]"
            style={{ background: "radial-gradient(ellipse, rgba(212,175,55,0.16) 0%, rgba(180,100,40,0.06) 45%, transparent 72%)" }}
          />
          <div
            className="absolute right-[8%] top-[25%] h-[350px] w-[350px] rounded-full blur-[110px]"
            style={{ background: "radial-gradient(ellipse, rgba(201,169,110,0.10) 0%, transparent 70%)" }}
          />
        </div>

        <div className="mx-auto grid max-w-[1360px] grid-cols-1 items-center gap-10 px-4 sm:px-6 md:grid-cols-2 lg:gap-16 relative z-10">
          {/* Left Column: Editorial Brand Lore */}
          <div className="flex flex-col text-left">
            <Reveal>
              <p className="eyebrow flex items-center gap-2 text-gold font-semibold tracking-[0.28em] mb-3 sm:mb-4">
                <span className="text-[10px]">✦</span>
                <span>OUR CRAFT & PHILOSOPHY · HOUSE OF AALIQADR</span>
                <span className="text-[10px]">✦</span>
              </p>
            </Reveal>

            <Reveal delay={0.08}>
              <h1 className="font-display text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-light leading-[1.05] tracking-tight text-ivory">
                High esteem,{" "}
                <span className="block italic font-light text-gold-soft">
                  in a single drop.
                </span>
              </h1>
            </Reveal>

            <Reveal delay={0.14}>
              <div className="my-4 sm:my-5 h-[1px] w-14 bg-gold/50" aria-hidden />
            </Reveal>

            <Reveal delay={0.18}>
              <div className="space-y-4 text-sm sm:text-[15px] text-ivory/85 font-normal leading-relaxed max-w-xl">
                <p>
                  <strong className="font-semibold text-ivory">Aaliqadr (عالي قدر)</strong> originates from the Arabic and Persian honorific signifying nobility of spirit, lofty stature, and revered presence. The house began with an indelible vision: that true luxury perfume is not mere ornament, but an intimate celestial signature.
                </p>
                <p>
                  Our sacred monogram unifies the calligraphic letters <span className="font-serif text-gold italic font-medium">Alif (ا)</span> and <span className="font-serif text-gold italic font-medium">Qaf (ق)</span> into the silhouette of a falling perfume drop that doubles as an eternal flame. Each signature is formulated around elemental harmonies of Fire, Earth, Air, and Water.
                </p>
              </div>
            </Reveal>

            {/* Quick Metrics Bar */}
            <Reveal delay={0.24}>
              <div className="mt-8 grid grid-cols-2 gap-3 sm:gap-3.5 border-t border-gold/20 pt-6 sm:grid-cols-4">
                {[
                  { val: "28%", label: "Master Extrait" },
                  { val: "12", label: "Zodiac Rashis" },
                  { val: "180", label: "Days Maceration" },
                  { val: "100%", label: "Noble Botanicals" },
                ].map((m) => (
                  <div key={m.label} className="rounded-xl border border-gold/25 bg-white/5 backdrop-blur-sm p-3 sm:p-3.5 text-center shadow-xs hover:border-gold/50 transition-colors">
                    <p className="font-display text-2xl sm:text-3xl font-normal text-gold">{m.val}</p>
                    <p className="font-caps text-[11px] sm:text-[12px] uppercase tracking-[0.16em] text-ivory/80 font-medium mt-1">{m.label}</p>
                  </div>
                ))}
              </div>
            </Reveal>
          </div>

          {/* Right Column: 3D Metallic Gold Monogram */}
          <div className="flex items-center justify-center md:justify-end">
            <Reveal delay={0.12} className="w-full max-w-[300px] sm:max-w-[340px] lg:max-w-[380px]">
              <div className="relative mx-auto flex flex-col items-center justify-center">
                <div className="relative aspect-square w-full rounded-full border border-gold/25 bg-white/[0.04] p-6 sm:p-8 shadow-[0_20px_70px_rgba(0,0,0,0.9)] flex flex-col items-center justify-center">
                  <div
                    aria-hidden
                    className="pointer-events-none absolute inset-0 -z-10 rounded-full blur-[55px]"
                    style={{ background: "radial-gradient(circle, rgba(201,169,110,0.22) 0%, rgba(180,90,50,0.08) 50%, transparent 70%)" }}
                  />

                  {/* 3D Polished Gold Flame Monogram (Alif + Qaf drop) */}
                  <svg
                    viewBox={mark.viewBox}
                    className="relative h-32 sm:h-36 md:h-40 lg:h-44 w-auto filter drop-shadow-[0_12px_28px_rgba(201,169,110,0.40)] drop-shadow-[0_4px_8px_rgba(0,0,0,0.9)] transition-transform duration-700 hover:scale-105"
                    role="img"
                    aria-label="Aaliqadr Monogram Flame (Alif + Qaf)"
                  >
                    <defs>
                      <linearGradient id="about-monogram-gold" x1="15%" y1="0%" x2="85%" y2="100%">
                        <stop offset="0%" stopColor="#FFF4D0" />
                        <stop offset="16%" stopColor="#E9C87B" />
                        <stop offset="36%" stopColor="#B38232" />
                        <stop offset="54%" stopColor="#FDEAB2" />
                        <stop offset="72%" stopColor="#8F5E1A" />
                        <stop offset="88%" stopColor="#E0B763" />
                        <stop offset="100%" stopColor="#FFF3CE" />
                      </linearGradient>
                      <linearGradient id="about-monogram-stroke" x1="0%" y1="100%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#6E440F" stopOpacity="0.85" />
                        <stop offset="48%" stopColor="#FFF6D8" stopOpacity="0.95" />
                        <stop offset="100%" stopColor="#5C3608" stopOpacity="0.85" />
                      </linearGradient>
                    </defs>
                    {mark.paths.map((d, i) => (
                      <path key={i} d={d} fill="url(#about-monogram-gold)" stroke="url(#about-monogram-stroke)" strokeWidth="1.2" strokeLinejoin="round" />
                    ))}
                  </svg>

                  {/* 3D Gold Wordmark */}
                  <svg
                    viewBox={wordmark.viewBox}
                    className="relative mt-3 h-4 sm:h-5 w-auto filter drop-shadow-[0_8px_16px_rgba(201,169,110,0.32)]"
                    role="img"
                    aria-label="AALIQADR"
                  >
                    <defs>
                      <linearGradient id="about-wordmark-gold" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#E2BD6D" />
                        <stop offset="25%" stopColor="#FFF7D6" />
                        <stop offset="50%" stopColor="#D29F3D" />
                        <stop offset="75%" stopColor="#FFF2BF" />
                        <stop offset="100%" stopColor="#C89635" />
                      </linearGradient>
                    </defs>
                    {wordmark.paths.map((d, i) => (
                      <path key={i} d={d} fill="url(#about-wordmark-gold)" strokeWidth="0.8" strokeLinejoin="round" />
                    ))}
                  </svg>

                  <span className="font-caps text-xs uppercase tracking-[0.24em] text-gold font-semibold mt-2">
                    Maison de Parfum
                  </span>
                </div>

                <div className="mt-4 flex items-center gap-2 rounded-full border border-gold/30 bg-white/5 px-4 py-1.5 backdrop-blur-md shadow-xs">
                  <span className="text-gold text-[10px]">✦</span>
                  <span className="font-caps text-xs sm:text-[13px] uppercase tracking-[0.18em] text-ivory/95 font-semibold">
                    Kannauj Distillation & Grasse Artistry
                  </span>
                  <span className="text-gold text-[10px]">✦</span>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          SECTION 2 · FOUR PILLARS — 📜 WARM LUXURY PARCHMENT (#FAF7F2)
          Pattern matching Home Page: Crisp White cards, deep espresso typography
          ═══════════════════════════════════════════════════════════════════ */}
      <section className="relative bg-[#FAF7F2] py-20 sm:py-28 border-t border-[#E8E2D5]">
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[450px] w-full max-w-[900px] bg-gradient-to-r from-transparent via-[#73531F]/[0.05] to-transparent blur-[80px]" />
        </div>

        <div className="mx-auto max-w-[1280px] px-4 sm:px-6">
          <Reveal>
            <div className="text-center max-w-2xl mx-auto mb-14">
              <p className="font-caps text-xs sm:text-[13px] tracking-[0.28em] text-[#73531F] font-semibold uppercase mb-3 flex items-center justify-center gap-2">
                <span className="text-[10px]">✦</span>
                <span>HAUTE PARFUMERIE STANDARD</span>
                <span className="text-[10px]">✦</span>
              </p>
              <h2 className="font-display text-3xl sm:text-5xl font-normal text-[#17130F] tracking-tight">
                The Four Pillars of Our Atelier
              </h2>
              <p className="mt-4 text-sm sm:text-base text-[#423B33] font-normal leading-relaxed max-w-[60ch] mx-auto">
                Every flacon leaving our studio adheres to strict classical perfumery benchmarks without shortcut or synthetic acceleration.
              </p>
            </div>
          </Reveal>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {CRAFT_PILLARS.map((p, i) => (
              <Reveal key={p.num} delay={i * 0.08} className="h-full">
                <div className="group relative flex h-full flex-col justify-between rounded-2xl border border-[#E8E2D5] bg-white p-7 sm:p-8 shadow-[0_4px_20px_rgba(0,0,0,0.04)] transition-all duration-300 hover:border-[#73531F]/40 hover:shadow-[0_12px_32px_rgba(115,83,31,0.10)] hover:-translate-y-1">
                  <div>
                    <span className="font-display text-4xl font-normal text-[#B8922B] group-hover:text-[#73531F] transition-colors">
                      {p.num}
                    </span>
                    <h3 className="font-display text-2xl sm:text-[26px] text-[#17130F] font-normal mt-3 mb-2 group-hover:text-[#73531F] transition-colors">
                      {p.title}
                    </h3>
                    <div className="h-[1px] w-8 bg-[#C9A96E]/50 my-3 transition-all duration-300 group-hover:w-14 group-hover:bg-[#C9A96E]" aria-hidden />
                    <p className="text-sm sm:text-[14.5px] text-[#423B33] font-normal leading-relaxed">
                      {p.desc}
                    </p>
                  </div>
                  <div className="mt-6 flex items-center gap-2 text-xs sm:text-[12.5px] font-caps uppercase tracking-[0.2em] text-[#73531F] font-semibold pt-4 border-t border-[#E8E2D5]">
                    <ShieldCheck className="size-4 shrink-0" />
                    <span>Maison Benchmark</span>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          SECTION 3 · FOUR ELEMENTS — 🌌 DEEP COSMIC OBSIDIAN (#07050A)
          Pattern matching Home Page: Rich black with glowing elemental cards
          ═══════════════════════════════════════════════════════════════════ */}
      <section className="relative bg-[#07050A] py-20 sm:py-28 text-ivory border-t border-gold/15">
        <div className="mx-auto max-w-[1280px] px-4 sm:px-6 relative z-10">
          <Reveal>
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-14 pb-6 border-b border-gold/15">
              <div>
                <p className="eyebrow flex items-center gap-2 text-gold font-semibold tracking-[0.26em] mb-3">
                  <span className="text-[10px]">✦</span>
                  <span>CELESTIAL CHEMISTRY</span>
                  <span className="text-[10px]">✦</span>
                </p>
                <h2 className="font-display text-3xl sm:text-5xl font-light text-ivory">
                  The Four Elemental Triplicities
                </h2>
              </div>
              <p className="max-w-md text-sm sm:text-base text-ivory/75 font-normal leading-relaxed">
                In classical astrology, temperament is governed by elemental balance. We map each sign&apos;s olfactory accords to its primal nature.
              </p>
            </div>
          </Reveal>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {ELEMENTS.map((el, i) => {
              const info = ELEMENT_INFO[el];
              const details = ELEMENT_DETAILS[el];

              return (
                <Reveal key={el} delay={i * 0.08} className="h-full">
                  <div className="group relative flex h-full flex-col justify-between overflow-hidden rounded-2xl border border-gold/20 bg-white/[0.04] p-6 sm:p-7 backdrop-blur-sm shadow-[0_8px_30px_rgba(0,0,0,0.6)] transition-all duration-500 hover:-translate-y-1.5 hover:border-gold/50 hover:bg-white/[0.07] hover:shadow-[0_20px_44px_rgba(0,0,0,0.75)]">
                    <div
                      aria-hidden
                      className="pointer-events-none absolute -right-8 -top-8 size-44 rounded-full opacity-25 blur-[55px] transition-opacity duration-700 group-hover:opacity-45"
                      style={{ background: details.accent }}
                    />

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-caps text-xs sm:text-[13px] uppercase tracking-[0.22em] text-gold font-semibold">
                          {details.sanskrit}
                        </span>
                        <span className="text-[10px] text-gold/70 select-none">✦</span>
                      </div>

                      <h3 className="font-display text-3xl sm:text-4xl font-normal text-ivory group-hover:text-gold transition-colors">
                        {info.label}
                      </h3>

                      <p className="font-caps text-xs sm:text-[12.5px] uppercase tracking-[0.16em] text-gold-soft font-semibold mt-1 mb-4">
                        {details.traits}
                      </p>

                      <div
                        className="h-[1px] w-8 mb-4 transition-all duration-500 ease-lux group-hover:w-16"
                        style={{ backgroundColor: details.accent }}
                        aria-hidden
                      />

                      <p className="text-sm sm:text-[14.5px] text-ivory/85 font-normal leading-relaxed mb-4">
                        {info.scent}
                      </p>

                      <div className="rounded-xl border border-gold/20 bg-black/40 p-3.5 sm:p-4 mb-5">
                        <p className="font-caps text-xs sm:text-[12.5px] uppercase tracking-[0.18em] text-gold mb-1.5 font-semibold">
                          Key Raw Accords:
                        </p>
                        <p className="font-serif italic text-sm sm:text-[14px] text-ivory/90 leading-relaxed">
                          {details.keyNotes}
                        </p>
                      </div>

                      <div className="space-y-2">
                        <p className="font-caps text-xs sm:text-[12.5px] uppercase tracking-[0.18em] text-ivory/70 font-semibold">
                          Associated Rashis:
                        </p>
                        <div className="grid grid-cols-1 gap-1.5">
                          {info.signs.map((slug) => {
                            const s = ZODIAC[slug];
                            return (
                              <Link
                                key={slug}
                                href={routes.sign(slug)}
                                className="group/item flex items-center justify-between rounded-xl border border-gold/15 bg-white/[0.04] px-3.5 py-2.5 text-xs sm:text-sm text-ivory/85 transition-all hover:border-gold/50 hover:bg-white/[0.08] hover:text-gold"
                              >
                                <div className="flex items-center gap-2.5">
                                  <ZodiacGoldGlyph sign={slug} className="size-4 shrink-0" />
                                  <span className="font-rashi text-sm text-gold font-medium">
                                    {RASHI_DEVANAGARI[slug]}
                                  </span>
                                  <span className="text-ivory/90 font-medium">{s.name}</span>
                                </div>
                                <span className="text-xs text-gold-soft/80 font-normal italic truncate max-w-[100px]">
                                  {s.fragrance.name}
                                </span>
                              </Link>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    <div className="mt-6 pt-4 border-t border-gold/15 flex items-center justify-between">
                      <Link
                        href={routes.collection(`${el}-signs`)}
                        className="font-caps text-xs uppercase tracking-[0.18em] text-gold group-hover:text-ivory transition-colors inline-flex items-center gap-2 font-semibold"
                      >
                        Explore {info.label} Collection
                        <ArrowRight className="size-3.5 text-gold transition-transform group-hover:translate-x-1" />
                      </Link>
                    </div>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          SECTION 4 · TWELVE ARCHETYPES — 📜 WARM LUXURY PARCHMENT (#FAF7F2)
          Pattern matching Home Page: Crisp White cards with gold medallions & high contrast
          ═══════════════════════════════════════════════════════════════════ */}
      <section className="relative bg-[#FAF7F2] py-20 sm:py-28 border-t border-[#E8E2D5]">
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute right-0 top-0 h-[450px] w-[450px] bg-gradient-to-bl from-[#73531F]/[0.04] to-transparent blur-[100px]" />
          <div className="absolute left-0 bottom-0 h-[400px] w-[400px] bg-gradient-to-tr from-[#73531F]/[0.04] to-transparent blur-[90px]" />
        </div>

        <div className="mx-auto max-w-[1280px] px-4 sm:px-6">
          <Reveal>
            <div className="text-center max-w-2xl mx-auto mb-14">
              <p className="font-caps text-xs sm:text-[13px] tracking-[0.28em] text-[#73531F] font-semibold uppercase mb-3 flex items-center justify-center gap-2">
                <span className="text-[10px]">✦</span>
                <span>THE TWELVE ARCHETYPES · SACRED RASHIS & EXTRAITS</span>
                <span className="text-[10px]">✦</span>
              </p>
              <h2 className="font-display text-3xl sm:text-5xl font-normal text-[#17130F] tracking-tight">
                Twelve Stars. Twelve Master Signatures.
              </h2>
              <p className="mt-4 text-sm sm:text-base text-[#423B33] font-normal leading-relaxed max-w-[60ch] mx-auto">
                Every bespoke flacon is hand-poured at 28% concentration, formulated around its sign&apos;s classical element, planetary ruler, and Ayurvedic constitutional essence.
              </p>
            </div>
          </Reveal>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
            {SIGNS.map((s, idx) => (
              <Reveal key={s.slug} delay={idx * 0.04} className="h-full">
                <Link
                  href={routes.product(s.fragrance.slug)}
                  className="group flex h-full flex-col justify-between rounded-2xl border border-[#E8E2D5] bg-white p-5 sm:p-6 transition-all duration-300 hover:-translate-y-1 hover:border-[#73531F]/50 hover:shadow-[0_12px_36px_rgba(115,83,31,0.12)] shadow-[0_2px_12px_rgba(0,0,0,0.04)]"
                >
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      {/* Gold Medallion on light background */}
                      <div className="flex size-12 items-center justify-center rounded-full border border-[#C9A96E]/50 bg-gradient-to-b from-[#FEF9EF] to-[#F0E4C4] shadow-[0_4px_12px_rgba(201,169,110,0.20)] transition-all duration-300 group-hover:scale-110 group-hover:border-[#C9A96E] group-hover:shadow-[0_6px_20px_rgba(201,169,110,0.30)]">
                        <ZodiacGoldGlyph sign={s.slug} className="size-6.5" />
                      </div>
                      <span className="rounded-full border border-[#C9A96E]/40 bg-[#C9A96E]/10 px-2.5 py-0.5 font-caps text-[11px] uppercase tracking-[0.14em] text-[#73531F] font-semibold group-hover:bg-[#C9A96E]/20 capitalize">
                        {s.element}
                      </span>
                    </div>

                    {/* Rashi & Sign Name */}
                    <div className="mb-2.5">
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <span className="font-rashi text-xl sm:text-[22px] font-bold text-[#B8922B] group-hover:text-[#73531F] transition-colors">
                          {RASHI_DEVANAGARI[s.slug]} राशि
                        </span>
                        <span className="text-[#C9A96E]/60 text-xs">✦</span>
                        <span className="font-caps text-xs sm:text-[12.5px] uppercase tracking-[0.18em] font-semibold text-[#17130F]/80">
                          {s.name}
                        </span>
                      </div>

                      {/* Fragrance Title */}
                      <h3 className="font-display text-2xl sm:text-[25px] font-normal text-[#17130F] group-hover:text-[#73531F] transition-colors tracking-tight leading-snug">
                        {s.fragrance.name}
                      </h3>
                    </div>

                    {/* Gold hairline */}
                    <div className="h-[1px] w-10 bg-[#C9A96E]/40 my-3 transition-all duration-300 group-hover:w-20 group-hover:bg-[#C9A96E]" aria-hidden />

                    {/* Tagline */}
                    <p className="font-serif italic text-sm sm:text-[14px] text-[#423B33] line-clamp-2 leading-relaxed">
                      &ldquo;{s.fragrance.tagline}&rdquo;
                    </p>
                  </div>

                  <div className="mt-5 pt-3.5 border-t border-[#E8E2D5] flex items-center justify-between text-xs sm:text-[12.5px] font-caps uppercase tracking-[0.18em] text-[#73531F] font-bold group-hover:text-[#17130F] transition-colors">
                    <span>Explore Extrait</span>
                    <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1.5" />
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          SECTION 5 · DAILY RITUAL — 🌌 NOCTURNAL OBSIDIAN (#060508)
          ═══════════════════════════════════════════════════════════════════ */}
      <section className="relative bg-[#060508] py-20 sm:py-28 text-ivory border-t border-gold/15">
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
          <div
            className="absolute left-[20%] top-1/2 -translate-y-1/2 h-[500px] w-[500px] rounded-full blur-[130px]"
            style={{ background: "radial-gradient(ellipse, rgba(212,175,55,0.13) 0%, transparent 70%)" }}
          />
        </div>

        <div className="mx-auto max-w-[1280px] px-4 sm:px-6 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-5 space-y-5">
              <Reveal>
                <p className="eyebrow flex items-center gap-2 text-gold font-semibold tracking-[0.26em]">
                  <span className="text-[10px]">✦</span>
                  <span>THE ART OF WEARING EXTRAIT</span>
                </p>
              </Reveal>
              <Reveal delay={0.08}>
                <h2 className="font-display text-3xl sm:text-5xl font-light text-ivory">
                  The Daily Celestial Ritual
                </h2>
              </Reveal>
              <Reveal delay={0.16}>
                <p className="text-sm sm:text-[15px] text-ivory/80 font-normal leading-relaxed">
                  Extrait de Parfum possesses a dense concentration of pure oils. Unlike commercial Eau de Toilette that evaporates in a burst of synthetic alcohol, pure Extrait warms gently on the skin, blossoming gradually across twelve hours.
                </p>
              </Reveal>
              <Reveal delay={0.24}>
                <div className="pt-2">
                  <ButtonLink href="/find-my-sign" variant="primary">
                    Find My Astrological Sign
                  </ButtonLink>
                </div>
              </Reveal>
            </div>

            <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { icon: <Sparkles className="size-4.5" />, title: "Apply on Pulse Points", body: "Mist from 15 centimeters onto warm radial pulse points: inner wrists, side of the neck, and clavicle." },
                { icon: <span className="font-serif text-base text-gold">✦</span>, title: "Never Rub the Oils", body: "Allow the fragrance to dry down organically. Friction crushes delicate floral top notes and fractures the olfactory pyramid." },
                { icon: <Compass className="size-4.5" />, title: "Sun & Moon Layering", body: "Layer your Western Sun sign on your neck for outer radiance, and your Vedic Moon rashi on your wrists for inward contemplation." },
                { icon: <span className="font-serif text-base text-gold">∞</span>, title: "Intimate Sillage", body: "Crafted to draw people in rather than overpower a room. A private aura reserved for those who step into your orbit." },
              ].map((card, i) => (
                <Reveal key={card.title} delay={0.1 + i * 0.06}>
                  <div className="rounded-2xl border border-gold/20 bg-white/[0.04] p-6 backdrop-blur-sm shadow-[0_8px_24px_rgba(0,0,0,0.50)] hover:border-gold/40 hover:bg-white/[0.07] transition-all duration-300">
                    <div className="size-10 rounded-full border border-gold/35 bg-gold/10 flex items-center justify-center text-gold mb-4 shadow-xs">
                      {card.icon}
                    </div>
                    <h3 className="font-display text-xl sm:text-2xl text-ivory font-normal mb-2">{card.title}</h3>
                    <p className="text-sm sm:text-[14.5px] text-ivory/80 leading-relaxed font-normal">{card.body}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          SECTION 6 · BOTTOM BANNER — 📜 WARM LUXURY PARCHMENT (#FAF7F2)
          ═══════════════════════════════════════════════════════════════════ */}
      <section className="relative bg-[#FAF7F2] py-20 sm:py-24 border-t border-[#E8E2D5]">
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute right-0 top-0 h-[400px] w-[400px] bg-gradient-to-bl from-[#73531F]/[0.06] to-transparent blur-[90px]" />
        </div>
        <div className="mx-auto max-w-[1280px] px-4 sm:px-6">
          <Reveal>
            <div className="relative overflow-hidden rounded-3xl border border-[#E8E2D5] bg-white p-8 sm:p-14 shadow-[0_12px_48px_rgba(0,0,0,0.06)] flex flex-col md:flex-row items-center justify-between gap-8">
              <div className="space-y-3.5 text-center md:text-left max-w-xl">
                <p className="font-caps text-xs sm:text-[13px] tracking-[0.28em] text-[#73531F] font-semibold uppercase flex items-center justify-center md:justify-start gap-2">
                  <span className="text-[10px]">✦</span>
                  <span>THE COMPLETE ZODIAC UNIVERSE</span>
                </p>
                <h3 className="font-display text-3xl sm:text-5xl font-normal text-[#17130F] tracking-tight">
                  Explore the Twelve Signatures
                </h3>
                <p className="font-sans text-sm sm:text-base text-[#423B33] font-normal leading-relaxed">
                  Discover the Extrait de Parfum composed precisely for your constellation, or sample all twelve in our Discovery Coffret.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row items-center gap-4 shrink-0">
                <ButtonLink href="/zodiac" variant="primary">
                  Explore 12 Zodiac Extraits
                </ButtonLink>
                <ButtonLink href={routes.product("zodiac-discovery-coffret")} variant="ghost">
                  Sample Coffret (12 x 2ml)
                </ButtonLink>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <JsonLd
        data={breadcrumbLd([
          { name: "Home", path: "/" },
          { name: "About Our Craft", path: "/about" },
        ])}
      />
      <JsonLd data={organizationLd()} />
    </div>
  );
}
