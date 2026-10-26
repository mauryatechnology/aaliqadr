import { Suspense } from "react";
import type { ProductCardDTO } from "@/server/catalog/types";
import type { FacetKey } from "@/lib/facets";
import { getCategories } from "@/server/queries/catalog";
import { ProductGrid } from "@/components/product/ProductGrid";
import { Listing } from "./Listing";

/**
 * Filters for a prerendered page (category, collection): the static grid is the fallback (and
 * what crawlers get), and the faceted listing streams in once the query string is read.
 */
export function FacetedSection({ cards, base, searchParams, hide }: { cards: ProductCardDTO[]; base: string; searchParams: Promise<Record<string, string | string[] | undefined>>; hide?: FacetKey[] }) {
  return (
    <Suspense fallback={<ProductGrid items={cards} />}>
      <Faceted cards={cards} base={base} searchParams={searchParams} hide={hide} />
    </Suspense>
  );
}

async function Faceted({ cards, base, searchParams, hide }: { cards: ProductCardDTO[]; base: string; searchParams: Promise<Record<string, string | string[] | undefined>>; hide?: FacetKey[] }) {
  const [params, categories] = await Promise.all([searchParams, getCategories()]);
  return <Listing cards={cards} base={base} params={params} categories={categories} hide={hide} />;
}
