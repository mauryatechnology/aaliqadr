import type { Metadata } from "next";
import { Suspense } from "react";
import { Search } from "lucide-react";
import { ZODIAC } from "@/config/zodiac";
import { getAllProducts } from "@/server/queries/catalog";
import { toCard, type ProductDTO } from "@/server/catalog/types";
import { ProductCard } from "@/components/product/ProductCard";
import { PageHero } from "@/components/layout/PageHero";

export const metadata: Metadata = {
  title: "Search",
  robots: { index: false, follow: true },
};

/** Weighted text match over the (small, cached) catalogue: name > sign > notes > description. */
function score(p: ProductDTO, terms: string[]): number {
  const sign = p.zodiacSign ? ZODIAC[p.zodiacSign] : undefined;
  const fields: [string, number][] = [
    [p.name, 10],
    [sign ? `${sign.name} ${sign.rashi} ${sign.element}` : (p.element ?? ""), 8],
    [p.notes ? [...p.notes.top, ...p.notes.heart, ...p.notes.base].map((n) => `${n.name} ${n.family}`).join(" ") : "", 5],
    [`${p.tagline} ${p.description}`, 1],
  ];
  return terms.reduce((total, t) => total + fields.reduce((s, [text, w]) => (text.toLowerCase().includes(t) ? s + w : s), 0), 0);
}

export default function SearchPage({ searchParams }: PageProps<"/search">) {
  return (
    <>
      <PageHero eyebrow="Search" title="Search the stars" />
      <div className="mx-auto max-w-[1360px] px-4 pb-20 sm:px-6">
        <Suspense fallback={<SearchForm defaultValue="" />}>
          <Results searchParams={searchParams} />
        </Suspense>
      </div>
    </>
  );
}

function SearchForm({ defaultValue }: { defaultValue: string }) {
  return (
    <form action="/search" role="search" className="surface mb-10 flex items-center gap-3 px-5">
      <Search className="size-5 text-muted" aria-hidden />
      <input
        name="q"
        type="search"
        defaultValue={defaultValue}
        placeholder="Search a sign, a note (oud, rose…) or a fragrance"
        aria-label="Search"
        maxLength={60}
        className="h-14 flex-1 bg-transparent text-lg outline-none placeholder:text-muted"
      />
    </form>
  );
}

async function Results({ searchParams }: { searchParams: PageProps<"/search">["searchParams"] }) {
  const { q } = await searchParams;
  const query = (typeof q === "string" ? q : "").trim().slice(0, 60);
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  const products = await getAllProducts();
  const results = terms.length
    ? products
        .map((p) => ({ p, s: score(p, terms) }))
        .filter((x) => x.s > 0)
        .sort((a, b) => b.s - a.s)
        .map((x) => toCard(x.p))
    : [];

  return (
    <>
      <SearchForm defaultValue={query} />
      {terms.length > 0 && (
        <p className="mb-6 text-sm text-muted" aria-live="polite">
          {results.length} result{results.length === 1 ? "" : "s"} for “{query}”
        </p>
      )}
      <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {results.map((p, i) => (
          <li key={p.id}>
            <ProductCard product={p} priority={i < 4} />
          </li>
        ))}
      </ul>
      {terms.length > 0 && results.length === 0 && <p className="text-muted">Nothing matched. Try a note like “rose”, or a sign like “Leo”.</p>}
    </>
  );
}
