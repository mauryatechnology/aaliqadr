import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { routes } from "@/lib/routes";
import { getCategories, getCollectionCards, getCollections } from "@/server/queries/catalog";
import { BottleArt } from "@/components/zodiac/BottleArt";
import { Reveal } from "@/components/motion/Reveal";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { ZodiacGoldGlyph } from "@/components/zodiac/ZodiacGoldGlyph";
import type { ZodiacSlug } from "@/config/zodiac";
import { breadcrumbLd, collectionPageLd, JsonLd } from "@/lib/jsonld";

export const metadata: Metadata = {
  title: "Curated Luxury Fragrance Collections & Elemental Edits | Aaliqadr",
  description:
    "Explore Aaliqadr curated fragrance edits: composed by celestial elements (Fire, Earth, Air, Water), luxury discovery sets, and patron-favourite Extrait signatures.",
  keywords: [
    "luxury perfume collections",
    "elemental perfume sets",
    "fire element perfume",
    "earth element fragrances",
    "zodiac perfume gifts",
    "haute parfumerie collections India",
  ],
  alternates: { canonical: "/collections" },
  openGraph: {
    title: "Curated Luxury Fragrance Collections | Aaliqadr",
    description: "Browse Aaliqadr fragrance edits: elemental triplicities, discovery coffrets and bestsellers.",
    url: "/collections",
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

const COLLECTION_META: Record<
  string,
  {
    tag: string;
    accent: string;
    eyebrow: string;
  }
> = {
  "fire-signs": {
    tag: "ELEMENTAL HARMONY",
    accent: "#E0533C",
    eyebrow: "Fire Realm · Agni (अग्नि)",
  },
  "earth-signs": {
    tag: "ELEMENTAL HARMONY",
    accent: "#3E8A5E",
    eyebrow: "Earth Realm · Prithvi (पृथ्वी)",
  },
  "air-signs": {
    tag: "ELEMENTAL HARMONY",
    accent: "#D4A843",
    eyebrow: "Air Realm · Vayu (वायु)",
  },
  "water-signs": {
    tag: "ELEMENTAL HARMONY",
    accent: "#3B82A6",
    eyebrow: "Water Realm · Jal (जल)",
  },
  "gifting": {
    tag: "CURATED GIFT EDITS",
    accent: "#C9A96E",
    eyebrow: "Discovery Coffrets & Sets",
  },
  "bestsellers": {
    tag: "PATRON FAVOURITES",
    accent: "#C9A96E",
    eyebrow: "Most Coveted Signatures",
  },
};

export default async function CollectionsIndex() {
  const [collections, categories] = await Promise.all([getCollections(), getCategories()]);
  const withCounts = await Promise.all(
    collections
      .toSorted((a, b) => Number(b.featured) - Number(a.featured))
      .map(async (c) => ({ c, cards: (await getCollectionCards(c.slug))?.cards ?? [] }))
  );

  return (
    <div className="relative overflow-clip bg-[#060508] text-ivory">
      {/* ── 1. GRAND HAUTE-PARFUMERIE COLLECTIONS HERO (BLACK LUXURY) ── */}
      <section className="relative isolate flex min-h-[52vh] sm:min-h-[58vh] flex-col justify-center items-center overflow-clip pt-28 pb-14 sm:pt-36 sm:pb-18 text-center bg-[#060508]">
        {/* Soft cosmic starlight nebula glow */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 flex items-center justify-center overflow-hidden"
        >
          <div className="absolute h-[500px] w-[500px] sm:h-[650px] sm:w-[650px] rounded-full bg-gold/[0.12] blur-[140px]" />
          <div className="absolute inset-0 bg-[radial-gradient(#C9A96E_1px,transparent_1px)] [background-size:72px_72px] opacity-15" />
        </div>

        <div className="mx-auto flex w-full max-w-[1280px] flex-col items-center px-4 sm:px-6">
          <Reveal>
            <p className="font-caps text-xs sm:text-[13px] tracking-[0.28em] text-gold font-medium mb-4 sm:mb-5 flex items-center justify-center gap-2">
              <span className="text-[9px]">✦</span>
              <span>CURATED EDITS · THE FOUR ELEMENTS · HOUSE OF AALIQADR</span>
              <span className="text-[9px]">✦</span>
            </p>
          </Reveal>

          <Reveal delay={0.08}>
            <h1 className="font-display text-4xl sm:text-6xl md:text-7xl font-light leading-[1.05] tracking-tight max-w-4xl text-ivory">
              Curated Collections.{" "}
              <span className="italic font-light text-[#E0C892]">
                The Astrological Edits.
              </span>
            </h1>
          </Reveal>

          <Reveal delay={0.16}>
            <p className="mt-4 sm:mt-5 max-w-2xl text-sm sm:text-base text-muted font-light leading-relaxed mx-auto">
              Edits across the whole house: assembled by celestial triplicity, bespoke gifting coffrets, and the signatures most revered by our patrons.
            </p>
          </Reveal>

          {/* Jump / Quick Filter Navigation Pills */}
          <Reveal delay={0.24} className="mt-8 flex flex-wrap items-center justify-center gap-2.5 sm:gap-3.5">
            <a
              href="#collections-grid"
              className="inline-flex min-h-[42px] items-center rounded-full border border-gold bg-gold px-6 py-2 font-caps text-xs uppercase tracking-[0.16em] text-obsidian font-semibold shadow-[0_0_14px_rgba(201,169,110,0.35)] transition-all duration-300 hover:bg-[#E5CB8C]"
            >
              The Four Elements
            </a>
            <Link
              href={routes.collection("gifting")}
              className="inline-flex min-h-[42px] items-center rounded-full border border-gold/30 bg-surface/80 px-5 py-2 font-caps text-xs uppercase tracking-[0.16em] text-ivory transition-all duration-300 hover:border-gold hover:text-gold"
            >
              The Gifting Edit
            </Link>
            <Link
              href={routes.collection("bestsellers")}
              className="inline-flex min-h-[42px] items-center rounded-full border border-gold/30 bg-surface/80 px-5 py-2 font-caps text-xs uppercase tracking-[0.16em] text-ivory transition-all duration-300 hover:border-gold hover:text-gold"
            >
              Bestsellers
            </Link>
            <Link
              href="/find-my-sign"
              className="inline-flex min-h-[42px] items-center gap-1.5 rounded-full border border-gold/40 bg-gold/10 px-5 py-2 font-caps text-xs uppercase tracking-[0.16em] text-gold transition-all duration-300 hover:border-gold hover:bg-gold/20"
            >
              <span className="text-[10px]">✦</span>
              <span>Find My Sign</span>
            </Link>
          </Reveal>
        </div>
      </section>

      {/* ── 2. WARM PARCHMENT WHITE SECTION: MAIN COLLECTIONS SHOWCASE ── */}
      <section
        id="collections-grid"
        className="relative bg-[#FAF7F2] text-[#17130F] py-16 sm:py-24 border-y border-[#E8E2D5] overflow-hidden"
      >
        <div className="mx-auto flex max-w-[1360px] flex-col gap-12 px-4 sm:px-6 lg:px-10">
          <Reveal>
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 border-b border-[#E8E2D5]">
              <div>
                <p className="font-caps text-[11px] sm:text-xs tracking-[0.24em] text-[#73531F] font-semibold uppercase mb-1 flex items-center gap-2">
                  <span className="size-1 rounded-full bg-[#73531F]" />
                  <span>HOUSE EDITS</span>
                </p>
                <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-normal text-[#17130F] tracking-tight">
                  Elemental & Bespoke Curations
                </h2>
              </div>
              <p className="text-xs sm:text-sm text-[#5A5046] max-w-md">
                Grouped by classical triplicities and luxury pairings, each collection provides celestial balance for soul and sillage.
              </p>
            </div>
          </Reveal>

          <ul className="grid grid-cols-1 gap-7 sm:grid-cols-2 lg:grid-cols-3">
            {withCounts
              .filter((x) => x.cards.length)
              .map(({ c, cards }, idx) => {
                const meta = COLLECTION_META[c.slug] ?? {
                  tag: "HOUSE CURATION",
                  accent: "#C9A96E",
                  eyebrow: `${cards.length} Signatures`,
                };

                return (
                  <li key={c.id}>
                    <Reveal delay={idx * 0.08} className="h-full">
                      <article className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-[#E8E2D5] bg-white shadow-[0_4px_24px_rgba(23,19,15,0.05)] transition-all duration-500 ease-lux hover:-translate-y-1.5 hover:border-[#C9A96E] hover:shadow-[0_18px_40px_rgba(23,19,15,0.08)]">
                        <Link href={routes.collection(c.slug)} className="flex h-full flex-col">
                          {/* Visual Area */}
                          <div className="relative aspect-[16/11] w-full overflow-hidden bg-[#F4EFE6] rounded-t-2xl">
                            {/* Radial Glow */}
                            <div
                              aria-hidden
                              className="pointer-events-none absolute inset-0 opacity-20 transition-all duration-700 ease-lux group-hover:opacity-35 group-hover:scale-110"
                              style={{
                                background: `radial-gradient(circle at 50% 45%, ${meta.accent} 0%, transparent 70%)`,
                              }}
                            />

                            {/* Bottle Centerpiece */}
                            <div className="absolute inset-0 flex items-center justify-center p-4 sm:p-5 transition-all duration-700 ease-lux group-hover:-translate-y-2 group-hover:scale-[1.04]">
                              {c.image ? (
                                <Image
                                  src={c.image.url}
                                  alt={c.image.alt || c.name}
                                  fill
                                  sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                                  className="object-cover opacity-90 transition-transform duration-700 group-hover:scale-105"
                                />
                              ) : (
                                <div
                                  className="relative max-h-56 w-auto"
                                  style={{
                                    filter: `drop-shadow(0 14px 28px rgba(0,0,0,0.3))`,
                                  }}
                                >
                                  <BottleArt
                                    sign={cards[0]?.zodiacSign}
                                    className="max-h-52 sm:max-h-56 w-auto"
                                  />
                                </div>
                              )}
                            </div>

                            {/* Top-Left Badge */}
                            <div className="absolute left-3.5 top-3.5 z-10">
                              <span className="inline-block rounded-full border border-[#E8E2D5] bg-white/95 px-3 py-1 font-caps text-[10px] uppercase tracking-[0.16em] text-[#73531F] font-semibold backdrop-blur-sm shadow-xs">
                                {meta.tag}
                              </span>
                            </div>

                            {/* Top-Right Count Badge */}
                            <div className="absolute right-3.5 top-3.5 z-10 flex items-center gap-1.5 rounded-full border border-[#E8E2D5] bg-white/95 px-3 py-1 font-caps text-[10.5px] text-[#17130F] backdrop-blur-sm shadow-xs">
                              <span>
                                {cards.length} {cards.length === 1 ? "Creation" : "Creations"}
                              </span>
                            </div>
                          </div>

                          {/* Content Body */}
                          <div className="flex flex-1 flex-col justify-between p-6 sm:p-7 bg-white rounded-b-2xl">
                            <div>
                              <div className="mb-2">
                                <p className="font-caps text-[11px] uppercase tracking-[0.24em] text-[#73531F] font-semibold">
                                  {meta.eyebrow}
                                </p>
                              </div>

                              <h3 className="font-display text-2xl sm:text-3xl font-normal text-[#17130F] group-hover:text-[#73531F] transition-colors">
                                {c.name}
                              </h3>

                              <div
                                className="my-2.5 h-[1px] w-8 transition-all duration-500 ease-lux group-hover:w-16 group-hover:!bg-[#73531F]"
                                style={{ backgroundColor: meta.accent, opacity: 0.8 }}
                                aria-hidden
                              />

                              <p className="line-clamp-2 text-xs sm:text-sm text-[#5A5046] font-normal leading-relaxed mb-4">
                                {c.description}
                              </p>

                              {/* Included Signs / Fragrance Pills */}
                              {cards.length > 0 && (
                                <div className="flex flex-wrap gap-2 mb-3">
                                  {cards.slice(0, 3).map((card) => {
                                    const devanagari = card.zodiacSign ? RASHI_DEVANAGARI[card.zodiacSign] : undefined;
                                    return (
                                      <span
                                        key={card.id}
                                        className="inline-flex items-center gap-1.5 rounded-full border border-[#E8E2D5] bg-[#FAF7F2] px-3 py-1 text-xs text-[#17130F] font-normal hover:border-[#C9A96E] transition-colors shadow-xs"
                                      >
                                        {card.zodiacSign && (
                                          <ZodiacGoldGlyph sign={card.zodiacSign as ZodiacSlug} className="size-3.5 shrink-0" />
                                        )}
                                        <span className="font-medium">{card.name.replace(/ · .*/, "")}</span>
                                        {devanagari && (
                                          <span className="font-rashi text-[11.5px] text-[#73531F] font-normal">
                                            ({devanagari})
                                          </span>
                                        )}
                                      </span>
                                    );
                                  })}
                                  {cards.length > 3 && (
                                    <span className="inline-flex items-center rounded-full border border-[#E8E2D5] bg-[#FAF7F2] px-2.5 py-1 text-[11px] text-[#73531F] font-medium">
                                      +{cards.length - 3} more
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>

                            <div className="mt-5 pt-3.5 border-t border-[#F0EBE0] flex items-center justify-between">
                              <span className="font-caps text-[11px] uppercase tracking-[0.22em] text-[#73531F] font-semibold group-hover:text-[#17130F] transition-colors">
                                Explore Collection
                              </span>
                              <ArrowRight className="size-4 text-[#73531F] transition-transform duration-300 group-hover:translate-x-1.5" />
                            </div>
                          </div>
                        </Link>
                      </article>
                    </Reveal>
                  </li>
                );
              })}
          </ul>
        </div>
      </section>

      {/* ── 3. DEEP OBSIDIAN BLACK SECTION: EXPLORE BY CATEGORY ── */}
      {categories.length > 0 && (
        <section className="relative bg-[#060508] text-ivory py-16 sm:py-24 border-b border-white/10 overflow-hidden">
          <div className="mx-auto max-w-[1360px] px-4 sm:px-6 lg:px-10">
            <Reveal>
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10 pb-6 border-b border-white/10">
                <div>
                  <p className="font-caps text-xs sm:text-[13px] tracking-[0.26em] text-gold font-medium uppercase mb-2 flex items-center gap-2">
                    <span className="text-[9px]">✦</span> Taxonomy & Classification
                  </p>
                  <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-light text-ivory">
                    Explore by Category
                  </h2>
                </div>
                <Link
                  href="/shop"
                  className="inline-flex min-h-[42px] items-center rounded-full border border-gold/35 bg-gold/10 px-6 py-2 font-caps text-xs uppercase tracking-[0.2em] text-gold hover:bg-gold/20 active:scale-98 transition-all"
                >
                  View All Fragrances →
                </Link>
              </div>
            </Reveal>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {categories.map((cat) => (
                <Link
                  key={cat.id}
                  href={routes.category(cat.slug)}
                  className="group rounded-2xl border border-white/10 bg-[#0E0C12] p-6 transition-all duration-300 hover:border-gold/50 hover:bg-[#14101A] hover:-translate-y-1 hover:shadow-xl flex flex-col justify-between"
                >
                  <div>
                    <p className="font-display text-xl text-ivory group-hover:text-gold transition-colors font-light">
                      {cat.name}
                    </p>
                    <p className="text-xs text-muted line-clamp-2 mt-2 font-light leading-relaxed">
                      {cat.description}
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-1 font-caps text-[10px] uppercase tracking-[0.2em] text-gold/90 mt-5 group-hover:text-gold font-medium">
                    Discover <ArrowRight className="size-3 transition-transform group-hover:translate-x-1" />
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── 4. WARM PARCHMENT WHITE SECTION: DISCOVERY COFFRET BANNER ── */}
      <section className="relative bg-[#FAF7F2] text-[#17130F] py-16 sm:py-24 border-b border-[#E8E2D5] overflow-hidden">
        <div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-10">
          <Reveal>
            <div className="relative overflow-hidden rounded-2xl border border-[#E8E2D5] bg-white p-8 sm:p-12 lg:p-14 shadow-[0_8px_36px_rgba(23,19,15,0.06)] flex flex-col md:flex-row items-center justify-between gap-8">
              <div className="space-y-3 text-center md:text-left max-w-xl">
                <p className="font-caps text-xs sm:text-[13px] tracking-[0.26em] text-[#73531F] font-semibold uppercase flex items-center justify-center md:justify-start gap-2">
                  <span className="text-[9px]">✦</span>
                  <span>THE DISCOVERY JOURNEY</span>
                </p>
                <h3 className="font-display text-3xl sm:text-4xl md:text-5xl font-normal text-[#17130F]">
                  Sample every celestial signature
                </h3>
                <p className="text-xs sm:text-sm text-[#5A5046] font-normal leading-relaxed">
                  Before committing to a full 50ml or 100ml flacon, experience the complete twelve-sign universe in our handcrafted miniature coffret, aged with the same 28% concentration.
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
          { name: "Collections", path: "/collections" },
        ])}
      />
      <JsonLd
        data={collectionPageLd({
          name: "Curated Collections",
          description: "Curated Aaliqadr edits: fragrances by element, gifting sets and bestsellers.",
          path: "/collections",
          items: collections.map((c) => ({ name: c.name, path: `/collections/${c.slug}` })),
        })}
      />
    </div>
  );
}
