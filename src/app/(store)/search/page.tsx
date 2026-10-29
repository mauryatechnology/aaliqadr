import type { Metadata } from "next";
import Link from "next/link";
import type { Route } from "next";
import { Suspense } from "react";
import { Search } from "lucide-react";
import { SIGNS } from "@/config/zodiac";
import { routes } from "@/lib/routes";
import { normalise } from "@/lib/search-engine";
import { getBestSellers, getCategories } from "@/server/queries/catalog";
import { searchProductCards } from "@/server/queries/search";
import { getContent } from "@/server/queries/engagement";
import { ProductGrid } from "@/components/product/ProductGrid";
import { Listing } from "@/components/listing/Listing";
import { SearchTracker } from "@/components/listing/SearchTracker";
import { Reveal } from "@/components/motion/Reveal";

export const metadata: Metadata = {
  title: "Search Luxury Fragrances & Rashis | Aaliqadr",
  robots: { index: false, follow: true },
};

export default function SearchPage({ searchParams }: PageProps<"/search">) {
  return (
    <div className="relative overflow-clip bg-[#060508] text-ivory">
      {/* ── 1. ULTRA-LUXURY BLACK HERO ── */}
      <section className="relative isolate flex min-h-[38vh] sm:min-h-[44vh] flex-col justify-center items-center overflow-clip pt-28 pb-10 sm:pt-36 sm:pb-12 text-center bg-[#060508]">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 flex items-center justify-center overflow-hidden"
        >
          <div className="absolute h-[450px] w-[450px] rounded-full bg-gold/[0.10] blur-[140px]" />
          <div className="absolute inset-0 bg-[radial-gradient(#C9A96E_1px,transparent_1px)] [background-size:72px_72px] opacity-15" />
        </div>

        <div className="mx-auto flex w-full max-w-[1200px] flex-col items-center px-4 sm:px-6">
          <Reveal>
            <p className="font-caps text-xs sm:text-[13px] tracking-[0.28em] text-gold font-medium mb-3 sm:mb-4 flex items-center justify-center gap-2">
              <span className="text-[9px]">✦</span>
              <span>THE CELESTIAL DIRECTORY · ASTROLOGICAL SEARCH</span>
              <span className="text-[9px]">✦</span>
            </p>
          </Reveal>

          <Reveal delay={0.08}>
            <h1 className="font-display text-4xl sm:text-6xl font-light leading-[1.05] tracking-tight max-w-4xl text-ivory">
              Search the Stars.{" "}
              <span className="italic font-light text-[#E0C892]">
                Find your scent.
              </span>
            </h1>
          </Reveal>
        </div>
      </section>

      {/* ── 2. SEARCH WORKSPACE & RESULTS ── */}
      <div className="mx-auto max-w-[1360px] px-4 pb-24 sm:px-6 lg:px-10">
        <Suspense fallback={<SearchForm defaultValue="" />}>
          <Results searchParams={searchParams} />
        </Suspense>
      </div>
    </div>
  );
}

function SearchForm({ defaultValue }: { defaultValue: string }) {
  return (
    <form
      action="/search"
      role="search"
      className="mb-8 flex items-center gap-3.5 rounded-2xl border border-gold/25 bg-[#0E0C12] px-5 backdrop-blur-md shadow-[0_15px_40px_rgba(0,0,0,0.5)] transition-all focus-within:border-gold"
    >
      <Search className="size-5 text-gold shrink-0" aria-hidden />
      <input
        name="q"
        type="search"
        defaultValue={defaultValue}
        placeholder="A sign or rashi (Leo, Mesh), a note (oud, kesar) or a fragrance"
        aria-label="Search"
        maxLength={60}
        className="h-14 flex-1 bg-transparent font-display text-lg text-ivory outline-none placeholder:font-sans placeholder:text-base placeholder:text-muted/60"
      />
    </form>
  );
}

async function Results({ searchParams }: { searchParams: PageProps<"/search">["searchParams"] }) {
  const params = await searchParams;
  const query = (typeof params.q === "string" ? params.q : "").trim().slice(0, 60);
  const [{ cards, suggestion }, categories, content] = await Promise.all([query ? searchProductCards(query) : { cards: [], suggestion: null }, getCategories(), getContent()]);

  if (!query) {
    return (
      <>
        <SearchForm defaultValue="" />
        {content.search.popular.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-muted">Popular:</span>
            {content.search.popular.map((p) => <Link key={p} href={`/search?q=${encodeURIComponent(p)}` as Route} className="rounded-full border border-white/15 px-3 py-1.5 hover:border-gold">{p}</Link>)}
          </div>
        )}
      </>
    );
  }

  const signMatch = SIGNS.find((s) => normalise(s.name) === normalise(query) || normalise(s.rashi) === normalise(query));

  return (
    <>
      <SearchTracker q={query} results={cards.length} />
      <SearchForm defaultValue={query} />
      {suggestion && (
        <p className="text-muted mb-6 text-sm">
          Did you mean{" "}
          <Link href={`/search?q=${encodeURIComponent(suggestion)}` as Route} className="text-fg underline underline-offset-4">
            {suggestion}
          </Link>
          ?
        </p>
      )}
      {signMatch && (
        <div className="surface mb-8 flex items-center justify-between gap-4 p-5 rounded-2xl border border-gold/30 bg-[#0E0C12]">
          <div>
            <p className="eyebrow">{signMatch.rashi} · {signMatch.element}</p>
            <p className="font-display text-2xl text-ivory">{signMatch.name}: {signMatch.fragrance.name}</p>
            <p className="text-muted text-sm">{signMatch.fragrance.tagline}</p>
          </div>
          <Link href={routes.sign(signMatch.slug)} className="rounded-full border border-gold bg-gold px-4 py-2 font-caps text-xs uppercase tracking-wider text-obsidian shrink-0 font-semibold">
            Explore sign →
          </Link>
        </div>
      )}
      <Listing cards={cards} base="/search" params={params} categories={categories} relevance empty={<EmptySearch query={query} />} />
    </>
  );
}

async function EmptySearch({ query }: { query: string }) {
  const bestSellers = await getBestSellers(4);
  return (
    <div className="py-8">
      <p className="font-display text-3xl text-ivory">No fragrances matched &ldquo;{query}&rdquo;</p>
      <p className="text-muted mt-2 text-sm">Try searching for a note family (woody, floral, spicy), a ruling element (fire, water) or browse our patron favourites below.</p>
      <div className="mt-12">
        <h2 className="eyebrow mb-6">Patron favourites</h2>
        <ProductGrid items={bestSellers} />
      </div>
    </div>
  );
}
