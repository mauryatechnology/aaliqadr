import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ELEMENT_INFO, ELEMENTS, type Element } from "@/config/zodiac";
import { cn } from "@/lib/cn";
import { breadcrumbLd, collectionPageLd, JsonLd } from "@/lib/jsonld";
import { getProductCards } from "@/server/queries/catalog";
import { ProductCard } from "@/components/product/ProductCard";
import { PageHero } from "@/components/layout/PageHero";

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

const TYPES = [
  { key: "fragrance", label: "Signatures" },
  { key: "bundle", label: "Discovery" },
  { key: "gift_set", label: "Gift sets" },
] as const;

export default function ShopPage({ searchParams }: PageProps<"/shop">) {
  return (
    <>
      <PageHero eyebrow="Shop" title="All fragrances">
        <p className="max-w-xl text-muted">Twelve signatures, the Discovery Coffret and Element Trios. Filter by element to find your kind of sky.</p>
      </PageHero>
      <div className="mx-auto max-w-[1360px] px-4 pb-20 sm:px-6">
        <Suspense fallback={<GridSkeleton />}>
          <Results searchParams={searchParams} />
        </Suspense>
      </div>
    </>
  );
}

async function Results({ searchParams }: { searchParams: PageProps<"/shop">["searchParams"] }) {
  const sp = await searchParams;
  const element = typeof sp.element === "string" && (ELEMENTS as readonly string[]).includes(sp.element) ? (sp.element as Element) : undefined;
  const type = typeof sp.type === "string" && TYPES.some((t) => t.key === sp.type) ? sp.type : undefined;
  const all = await getProductCards();
  const items = all.filter((p) => (!element || p.element === element) && (!type || p.type === type));

  const chip = (active: boolean) =>
    cn("rounded-full border px-4 py-2 text-xs uppercase tracking-[0.18em] transition-colors", active ? "border-gold bg-gold text-obsidian" : "border-white/15 text-fg/80 hover:border-gold/60");

  return (
    <>
      <nav aria-label="Filters" className="mb-8 flex flex-wrap gap-2">
        <Link href="/shop" className={chip(!element && !type)}>All</Link>
        {TYPES.map((t) => (
          <Link key={t.key} href={`/shop?type=${t.key}`} className={chip(type === t.key)}>{t.label}</Link>
        ))}
        <span aria-hidden className="mx-1 w-px bg-white/10" />
        {ELEMENTS.map((el) => (
          <Link key={el} href={`/shop?element=${el}`} className={chip(element === el)}>{ELEMENT_INFO[el].label}</Link>
        ))}
      </nav>
      <p className="mb-6 text-sm text-muted" aria-live="polite">
        {items.length} {items.length === 1 ? "fragrance" : "fragrances"}
      </p>
      <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((p, i) => (
          <li key={p.id}>
            <ProductCard product={p} priority={i < 4} />
          </li>
        ))}
      </ul>
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
          items: items.map((p) => ({
            name: p.name,
            path: `/perfume/${p.slug}`,
          })),
        })}
      />
    </>
  );
}

function GridSkeleton() {
  return (
    <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4" aria-hidden>
      {Array.from({ length: 8 }, (_, i) => (
        <li key={i} className="surface aspect-[4/6] animate-pulse" />
      ))}
    </ul>
  );
}
