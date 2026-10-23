import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ELEMENT_INFO, ELEMENTS, type Element } from "@/config/zodiac";
import { cn } from "@/lib/cn";
import { breadcrumbLd, collectionPageLd, JsonLd } from "@/lib/jsonld";
import type { Route } from "next";
import { descendantIds, getCategories, getProductCards } from "@/server/queries/catalog";
import { ProductGrid } from "@/components/product/ProductGrid";
import { ShopControls } from "@/components/product/ShopControls";
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

const SORTS = [
  { key: "", label: "Featured" },
  { key: "bestselling", label: "Bestselling" },
  { key: "newest", label: "Newest" },
  { key: "price-asc", label: "Price: low to high" },
  { key: "price-desc", label: "Price: high to low" },
];

async function Results({ searchParams }: { searchParams: PageProps<"/shop">["searchParams"] }) {
  const sp = await searchParams;
  const str = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : "");
  const element = (ELEMENTS as readonly string[]).includes(str("element")) ? (str("element") as Element) : undefined;
  const type = TYPES.some((t) => t.key === str("type")) ? str("type") : undefined;
  const [all, categories] = await Promise.all([getProductCards(), getCategories()]);
  const category = categories.find((c) => c.slug === str("category"));
  const inCategory = category ? descendantIds(categories, category.id) : undefined;
  const items = all
    .filter((p) => (!element || p.element === element) && (!type || p.type === type) && (!inCategory || (p.categoryId && inCategory.has(p.categoryId))) && (str("stock") !== "in" || p.inStock))
    .toSorted((a, b) => {
      switch (str("sort")) {
        case "bestselling":
          return b.salesCount - a.salesCount;
        case "newest":
          return b.createdAt.localeCompare(a.createdAt);
        case "price-asc":
          return a.fromPriceP - b.fromPriceP;
        case "price-desc":
          return b.fromPriceP - a.fromPriceP;
        default:
          return a.sortOrder - b.sortOrder;
      }
    });
  const withProducts = categories.filter((c) => all.some((p) => p.categoryId && descendantIds(categories, c.id).has(p.categoryId)));
  const href = (patch: Record<string, string | undefined>) => {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries({ category: category?.slug, type, element, sort: str("sort") || undefined, stock: str("stock") || undefined, ...patch })) if (v) q.set(k, v);
    const s = q.toString();
    return `/shop${s ? `?${s}` : ""}` as Route;
  };

  const chip = (active: boolean) =>
    cn("rounded-full border px-4 py-2 text-xs uppercase tracking-[0.18em] transition-colors", active ? "border-gold bg-gold text-obsidian" : "border-white/15 text-fg/80 hover:border-gold/60");

  return (
    <>
      <nav aria-label="Filters" className="mb-4 flex flex-wrap gap-2">
        <Link href={href({ category: undefined, type: undefined, element: undefined })} className={chip(!element && !type && !category)}>All</Link>
        {withProducts.length > 1
          ? withProducts.filter((c) => c.parentId).map((c) => (
              <Link key={c.id} href={href({ category: category?.id === c.id ? undefined : c.slug, type: undefined })} className={chip(category?.id === c.id)}>{c.name}</Link>
            ))
          : TYPES.map((t) => (
              <Link key={t.key} href={href({ type: type === t.key ? undefined : t.key })} className={chip(type === t.key)}>{t.label}</Link>
            ))}
        <span aria-hidden className="mx-1 w-px bg-white/10" />
        {ELEMENTS.map((el) => (
          <Link key={el} href={href({ element: element === el ? undefined : el })} className={chip(element === el)}>{ELEMENT_INFO[el].label}</Link>
        ))}
      </nav>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted" aria-live="polite">
          {items.length} {items.length === 1 ? "fragrance" : "fragrances"}{category ? ` in ${category.name}` : ""}
        </p>
        <ShopControls sorts={SORTS} />
      </div>
      {items.length ? <ProductGrid items={items} /> : <p className="text-muted">Nothing matches these filters. <Link href="/shop" className="underline underline-offset-4">Clear them</Link>.</p>}
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
    <ul className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4" aria-hidden>
      {Array.from({ length: 8 }, (_, i) => (
        <li key={i} className="surface aspect-[4/6] animate-pulse" />
      ))}
    </ul>
  );
}
