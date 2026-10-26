import type { Metadata } from "next";
import { Suspense } from "react";
import { breadcrumbLd, collectionPageLd, JsonLd } from "@/lib/jsonld";
import { getCategories, getProductCards } from "@/server/queries/catalog";
import { Listing } from "@/components/listing/Listing";
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

export default function ShopPage({ searchParams }: PageProps<"/shop">) {
  return (
    <>
      <PageHero eyebrow="Shop" title="All fragrances">
        <p className="max-w-xl text-muted">Twelve signatures, the Discovery Coffret and Element Trios. Filter by sign, element, note family, size or price.</p>
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
        <li key={i} className="surface aspect-[4/6] animate-pulse" />
      ))}
    </ul>
  );
}
