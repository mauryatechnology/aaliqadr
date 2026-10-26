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
import { PageHero } from "@/components/layout/PageHero";
import { Listing } from "@/components/listing/Listing";
import { SearchTracker } from "@/components/listing/SearchTracker";

export const metadata: Metadata = {
  title: "Search",
  robots: { index: false, follow: true },
};

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
    <form action="/search" role="search" className="surface mb-8 flex items-center gap-3 px-5">
      <Search className="size-5 text-muted" aria-hidden />
      <input
        name="q"
        type="search"
        defaultValue={defaultValue}
        placeholder="A sign or rashi (Leo, Mesh), a note (oud, kesar) or a fragrance"
        aria-label="Search"
        maxLength={60}
        className="h-14 flex-1 bg-transparent text-lg outline-none placeholder:text-muted"
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

  return (
    <>
      <SearchForm defaultValue={query} />
      <SearchTracker q={query} results={cards.length} />
      {cards.length > 0 ? (
        <div data-search-results>
          <Listing cards={cards} base="/search" params={params} categories={categories} relevance />
        </div>
      ) : (
        <NoResults query={query} suggestion={suggestion} />
      )}
    </>
  );
}

async function NoResults({ query, suggestion }: { query: string; suggestion: string | null }) {
  const [best, categories] = await Promise.all([getBestSellers(4), getCategories()]);
  const t = normalise(query);
  const sign = SIGNS.find((s) => t.includes(normalise(s.name).slice(0, 3)) || t.includes(normalise(s.rashi).slice(0, 3)));
  const cat = categories.find((c) => normalise(c.name).split(" ").some((w) => w.length > 3 && t.includes(w.slice(0, 4))));
  return (
    <div className="flex flex-col gap-8" aria-live="polite">
      <div className="flex flex-col gap-2">
        <p className="text-lg">Nothing matched “{query}”.</p>
        {suggestion && (
          <p className="text-muted">
            Did you mean <Link href={`/search?q=${encodeURIComponent(suggestion)}` as Route} className="text-fg underline underline-offset-4">{suggestion}</Link>?
          </p>
        )}
        <p className="flex flex-wrap gap-3 text-sm text-muted">
          {sign && <Link href={routes.sign(sign.slug)} className="underline underline-offset-4 hover:text-fg">See {sign.name} ({sign.rashi})</Link>}
          {cat && <Link href={routes.category(cat.slug)} className="underline underline-offset-4 hover:text-fg">Browse {cat.name}</Link>}
          <Link href="/find-my-sign" className="underline underline-offset-4 hover:text-fg">Find your sign</Link>
          <Link href={`/contact?about=${encodeURIComponent(`Looking for: ${query}`)}` as Route} className="underline underline-offset-4 hover:text-fg">Tell us what you were looking for</Link>
        </p>
      </div>
      {best.length > 0 && (
        <section>
          <h2 className="eyebrow mb-4">Bestsellers</h2>
          <ProductGrid items={best} />
        </section>
      )}
    </div>
  );
}
