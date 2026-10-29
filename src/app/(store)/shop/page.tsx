import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { Compass } from "lucide-react";
import { breadcrumbLd, collectionPageLd, JsonLd } from "@/lib/jsonld";
import { getCategories, getProductCards } from "@/server/queries/catalog";
import { Listing } from "@/components/listing/Listing";
import { Reveal } from "@/components/motion/Reveal";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { routes } from "@/lib/routes";

export const metadata: Metadata = {
  title: "Shop Luxury Zodiac Perfumes & Extrait de Parfum | Aaliqadr",
  description:
    "Explore the complete collection of Aaliqadr luxury perfumes. Twelve zodiac Extrait signatures, Discovery Coffret sample kits, and Element Trios with 28% oil concentration. Free shipping across India.",
  keywords: [
    "buy luxury perfume India",
    "zodiac perfume collection",
    "extrait de parfum shop",
    "perfume discovery set",
    "long lasting fragrances India",
    "astrology gift perfume",
    "elemental perfumes",
  ],
  alternates: { canonical: "/shop" },
  openGraph: {
    title: "Shop Luxury Zodiac Perfumes & Extrait de Parfum | Aaliqadr",
    description: "Browse twelve zodiac Extrait de Parfum signatures, discovery sets, and element trios.",
    url: "/shop",
    type: "website",
  },
};

export default function ShopPage({ searchParams }: PageProps<"/shop">) {
  return (
    <div className="relative overflow-clip bg-[#060508] text-ivory">
      {/* ── 1. ULTRA-LUXURY BLACK HERO ── */}
      <section className="relative isolate flex min-h-[44vh] sm:min-h-[50vh] flex-col justify-center items-center overflow-clip pt-28 pb-10 sm:pt-36 sm:pb-14 text-center bg-[#060508]">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 flex items-center justify-center overflow-hidden"
        >
          <div className="absolute h-[500px] w-[500px] sm:h-[650px] sm:w-[650px] rounded-full bg-gold/[0.10] blur-[140px]" />
          <div className="absolute inset-0 bg-[radial-gradient(#C9A96E_1px,transparent_1px)] [background-size:72px_72px] opacity-15" />
        </div>

        <div className="mx-auto flex w-full max-w-[1280px] flex-col items-center px-4 sm:px-6">
          <Reveal>
            <p className="font-caps text-xs sm:text-[13px] tracking-[0.28em] text-gold font-medium mb-3 sm:mb-4 flex items-center justify-center gap-2">
              <span className="text-[9px]">✦</span>
              <span>HAUTE PARFUMERIE · 28% MASTER EXTRAIT</span>
              <span className="text-[9px]">✦</span>
            </p>
          </Reveal>

          <Reveal delay={0.08}>
            <h1 className="font-display text-4xl sm:text-6xl md:text-7xl font-light leading-[1.05] tracking-tight max-w-4xl text-ivory">
              All Fragrances.{" "}
              <span className="italic font-light text-[#E0C892]">
                Crafted for your rashi.
              </span>
            </h1>
          </Reveal>

          <Reveal delay={0.16}>
            <p className="mt-4 sm:mt-5 max-w-2xl text-sm sm:text-base text-muted font-light leading-relaxed mx-auto">
              Twelve zodiac signatures, the Discovery Coffret, and elemental edits. Filter by sign, element, note family, size, or price.
            </p>
          </Reveal>

          {/* Quick Jump Pills */}
          <Reveal delay={0.22} className="mt-6 flex flex-wrap items-center justify-center gap-2 sm:gap-3">
            <Link
              href="/shop?element=fire"
              className="inline-flex min-h-[36px] items-center rounded-full border border-gold/30 bg-surface/80 px-4 py-1.5 font-caps text-[11px] uppercase tracking-[0.16em] text-ivory hover:border-gold hover:text-gold transition-all"
            >
              Agni · Fire
            </Link>
            <Link
              href="/shop?element=earth"
              className="inline-flex min-h-[36px] items-center rounded-full border border-gold/30 bg-surface/80 px-4 py-1.5 font-caps text-[11px] uppercase tracking-[0.16em] text-ivory hover:border-gold hover:text-gold transition-all"
            >
              Prithvi · Earth
            </Link>
            <Link
              href="/shop?element=air"
              className="inline-flex min-h-[36px] items-center rounded-full border border-gold/30 bg-surface/80 px-4 py-1.5 font-caps text-[11px] uppercase tracking-[0.16em] text-ivory hover:border-gold hover:text-gold transition-all"
            >
              Vayu · Air
            </Link>
            <Link
              href="/shop?element=water"
              className="inline-flex min-h-[36px] items-center rounded-full border border-gold/30 bg-surface/80 px-4 py-1.5 font-caps text-[11px] uppercase tracking-[0.16em] text-ivory hover:border-gold hover:text-gold transition-all"
            >
              Jal · Water
            </Link>
            <Link
              href="/find-my-sign"
              className="inline-flex min-h-[36px] items-center gap-1.5 rounded-full border border-gold/40 bg-gold/10 px-4 py-1.5 font-caps text-[11px] uppercase tracking-[0.16em] text-gold hover:border-gold hover:bg-gold/20 transition-all"
            >
              <Compass className="size-3" />
              <span>Find My Sign</span>
            </Link>
          </Reveal>
        </div>
      </section>

      {/* ── 2. CATALOGUE LISTING ── */}
      <section className="relative bg-[#060508] pb-24 sm:pb-32">
        <div className="mx-auto max-w-[1360px] px-4 sm:px-6 lg:px-10">
          <Suspense fallback={<GridSkeleton />}>
            <Results searchParams={searchParams} />
          </Suspense>
        </div>
      </section>

      {/* ── 3. WARM PARCHMENT WHITE SECTION: THE ATELIER STANDARD ── */}
      <section className="relative bg-[#FAF7F2] text-[#17130F] py-16 sm:py-24 border-y border-[#E8E2D5] overflow-hidden">
        <div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-10">
          <Reveal className="text-center max-w-3xl mx-auto mb-14 sm:mb-16">
            <p className="font-caps text-xs sm:text-[13px] tracking-[0.28em] text-[#73531F] font-semibold uppercase mb-3 flex items-center justify-center gap-2">
              <span className="text-[#73531F] text-[10px]">✦</span>
              <span>THE ATELIER STANDARD · HAUTE PARFUMERIE</span>
              <span className="text-[#73531F] text-[10px]">✦</span>
            </p>
            <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-normal text-[#17130F] tracking-tight">
              Crafted for Majesty. Compounded for Sillage.
            </h2>
            <p className="mt-4 text-sm sm:text-base text-[#423B33] font-normal leading-relaxed">
              Every Aaliqadr creation adheres to the strict disciplines of French fine perfumery combined with noble Indian botanical hydro-distillates.
            </p>
          </Reveal>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
            <Reveal delay={0.08}>
              <div className="h-full rounded-2xl border border-[#E8E2D5] bg-white p-7 sm:p-8 shadow-[0_4px_20px_rgba(23,19,15,0.04)]">
                <p className="font-display text-2xl text-[#73531F] font-serif mb-3">I</p>
                <h3 className="font-display text-xl sm:text-2xl font-normal text-[#17130F] mb-2.5">
                  28% Pure Extrait Tier
                </h3>
                <p className="text-xs sm:text-sm text-[#5A5046] font-normal leading-relaxed">
                  The highest category of fragrance compounding. Formulated with 28% pure oil essence to ensure 12+ hours of majestic sillage on skin and natural textiles.
                </p>
              </div>
            </Reveal>

            <Reveal delay={0.16}>
              <div className="h-full rounded-2xl border border-[#E8E2D5] bg-white p-7 sm:p-8 shadow-[0_4px_20px_rgba(23,19,15,0.04)]">
                <p className="font-display text-2xl text-[#73531F] font-serif mb-3">II</p>
                <h3 className="font-display text-xl sm:text-2xl font-normal text-[#17130F] mb-2.5">
                  Risk-Free Discovery Flacon
                </h3>
                <p className="text-xs sm:text-sm text-[#5A5046] font-normal leading-relaxed">
                  Every 50ml flacon arrives with a matching 2ml sample vial. Test the sample first; if it does not resonate with your spirit, return the unopened full flacon within 7 days.
                </p>
              </div>
            </Reveal>

            <Reveal delay={0.24}>
              <div className="h-full rounded-2xl border border-[#E8E2D5] bg-white p-7 sm:p-8 shadow-[0_4px_20px_rgba(23,19,15,0.04)]">
                <p className="font-display text-2xl text-[#73531F] font-serif mb-3">III</p>
                <h3 className="font-display text-xl sm:text-2xl font-normal text-[#17130F] mb-2.5">
                  Insulated Air Dispatch
                </h3>
                <p className="text-xs sm:text-sm text-[#5A5046] font-normal leading-relaxed">
                  Natural essential oils degrade under heat shocks. We ship in temperature-protected inner cartons via premium air partners pan-India with real-time GPS tracking.
                </p>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── 4. BLACK DISCOVERY COFFRET BANNER ── */}
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
                  <span>THE DISCOVERY SET</span>
                </p>
                <h3 className="font-display text-3xl sm:text-4xl md:text-5xl font-light text-ivory">
                  Sample all twelve celestial signs
                </h3>
                <p className="font-sans text-xs sm:text-sm text-ivory/80 font-light leading-relaxed">
                  Before choosing a full 50ml flacon, experience the entire zodiac wheel in our handcrafted miniature coffret (12 x 2ml), compounded with the identical 28% concentration.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row items-center gap-4 shrink-0">
                <ButtonLink href={routes.product("zodiac-discovery-coffret")} variant="primary" size="lg">
                  Explore Discovery Coffret
                </ButtonLink>
                <ButtonLink href="/find-my-sign" variant="secondary" size="lg">
                  Find My Sign Calculator
                </ButtonLink>
              </div>
            </div>
          </Reveal>
        </div>
      </section>
    </div>
  );
}

async function Results({ searchParams }: { searchParams: PageProps<"/shop">["searchParams"] }) {
  const params = await searchParams;
  const [all, categories] = await Promise.all([getProductCards(), getCategories()]);
  return (
    <>
      <Listing cards={all} base="/shop" params={params} categories={categories} />
      <JsonLd
        data={breadcrumbLd([
          { name: "Home", path: "/" },
          { name: "Shop", path: "/shop" },
        ])}
      />
      <JsonLd
        data={collectionPageLd({
          name: "All Fragrances",
          description: "Twelve zodiac signatures, the Discovery Coffret and Element Trios.",
          path: "/shop",
          items: all.map((p) => ({ name: p.name, path: `/perfume/${p.slug}` })),
        })}
      />
    </>
  );
}

function GridSkeleton() {
  return (
    <ul className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4" aria-hidden>
      {Array.from({ length: 8 }, (_, i) => (
        <li key={i} className="surface aspect-[4/6] animate-pulse rounded-2xl border border-white/5" />
      ))}
    </ul>
  );
}
