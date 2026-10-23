import "server-only";
import { revalidateTag } from "next/cache";
import { db } from "@/server/db/connect";
import { Product } from "@/server/models/Product";
import { fromDoc, tags, type LeanProduct } from "@/server/queries/catalog";
import type { ProductDTO } from "@/server/catalog/types";

/** Uncached product reads for money paths (checkout, orders) and the admin. */

export async function loadActiveProductsFresh(): Promise<ProductDTO[]> {
  await db();
  const docs = await Product.find({ status: "active" }).lean<LeanProduct[]>();
  return docs.map(fromDoc);
}

/** Stock or catalogue changed: refresh affected product pages in the background (SWR). */
export function revalidateProducts(slugs: Iterable<string>) {
  for (const slug of new Set(slugs)) revalidateTag(tags.product(slug), "max");
  revalidateTag(tags.products, "max");
}
