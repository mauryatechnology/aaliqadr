import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import type { Element, ZodiacSlug } from "@/config/zodiac";
import { db, isDatabaseConfigured } from "@/server/db/connect";
import { Product, type ProductDoc } from "@/server/models/Product";
import { SEED_PRODUCTS } from "@/server/catalog/seed";
import { toCard, type ProductCardDTO, type ProductDTO } from "@/server/catalog/types";

/**
 * Cached catalogue reads (docs/03 §5). Every storefront page reads through here, so most
 * pageviews cost zero database reads. Writes invalidate with updateTag / revalidateTag:
 *   "products"          any change to the catalogue list
 *   "product:{slug}"    one product page
 */

export const tags = {
  products: "products",
  product: (slug: string) => `product:${slug}`,
};

export type LeanProduct = ProductDoc & { _id: { toString(): string }; updatedAt?: Date };

export function fromDoc(d: LeanProduct): ProductDTO {
  return {
    id: d._id.toString(),
    slug: d.slug,
    type: d.type,
    name: d.name,
    tagline: d.tagline ?? "",
    description: d.description,
    zodiacSign: (d.zodiacSign ?? undefined) as ZodiacSlug | undefined,
    element: (d.element ?? undefined) as Element | undefined,
    concentration: (d.concentration ?? undefined) as ProductDTO["concentration"],
    notes: d.notes ? (JSON.parse(JSON.stringify(d.notes)) as ProductDTO["notes"]) : undefined,
    noteFamilies: d.noteFamilies ?? [],
    profile: d.profile?.intensity ? (JSON.parse(JSON.stringify(d.profile)) as ProductDTO["profile"]) : undefined,
    howToWear: d.howToWear ?? undefined,
    compatibleSigns: (d.compatibleSigns ?? []) as ZodiacSlug[],
    includes: d.includes?.map((i) => ({ name: i.name ?? "", detail: i.detail ?? "" })),
    variants: d.variants.map((v) => ({
      sku: v.sku,
      label: v.label,
      volumeMl: v.volumeMl,
      mrpP: v.mrpP,
      priceP: v.priceP,
      stock: v.stock,
      lowStockThreshold: v.lowStockThreshold ?? 5,
      weightG: v.weightG,
      isActive: v.isActive ?? true,
      codAllowed: v.codAllowed ?? true,
      maxPerOrder: v.maxPerOrder ?? 5,
    })),
    media: (d.media ?? []).map((m) => ({
      url: m.url,
      alt: m.alt,
      width: m.width,
      height: m.height,
      blurDataURL: m.blurDataURL ?? undefined,
      role: (m.role ?? undefined) as ProductDTO["media"][number]["role"],
    })),
    legal: {
      manufacturer: d.legal?.manufacturer ?? "",
      countryOfOrigin: d.legal?.countryOfOrigin ?? "India",
      genericName: d.legal?.genericName ?? "",
    },
    hsnCode: d.hsnCode,
    gstRateBps: d.gstRateBps,
    seo: { title: d.seo?.title ?? undefined, description: d.seo?.description ?? undefined },
    ratingAvg: d.ratingAvg ?? 0,
    ratingCount: d.ratingCount ?? 0,
    salesCount: d.salesCount ?? 0,
    sortOrder: d.sortOrder ?? 0,
    updatedAt: (d.updatedAt ?? new Date(0)).toISOString(),
  };
}

/** Database when configured; otherwise the seed catalogue (explicit local-dev mode, docs/03 §7). */
async function loadActiveProducts(): Promise<ProductDTO[]> {
  if (!isDatabaseConfigured()) return SEED_PRODUCTS;
  await db();
  const docs = await Product.find({ status: "active" }).sort({ sortOrder: 1 }).lean<LeanProduct[]>();
  return docs.map(fromDoc);
}

export async function getAllProducts(): Promise<ProductDTO[]> {
  "use cache";
  cacheLife("catalog");
  cacheTag(tags.products);
  return loadActiveProducts();
}

export async function getProductBySlug(slug: string): Promise<ProductDTO | null> {
  "use cache";
  cacheLife("catalog");
  cacheTag(tags.product(slug), tags.products);
  const all = await loadActiveProducts();
  return all.find((p) => p.slug === slug) ?? null;
}

export async function getProductCards(): Promise<ProductCardDTO[]> {
  "use cache";
  cacheLife("catalog");
  cacheTag(tags.products);
  return (await loadActiveProducts()).map(toCard);
}

export async function getFragranceForSign(sign: ZodiacSlug): Promise<ProductDTO | null> {
  "use cache";
  cacheLife("catalog");
  cacheTag(tags.products);
  return (await loadActiveProducts()).find((p) => p.type === "fragrance" && p.zodiacSign === sign) ?? null;
}

export async function getBestSellers(limit = 8): Promise<ProductCardDTO[]> {
  "use cache";
  cacheLife("catalog");
  cacheTag(tags.products);
  return (await loadActiveProducts())
    .toSorted((a, b) => b.salesCount - a.salesCount)
    .slice(0, limit)
    .map(toCard);
}

export async function getProductSlugs(): Promise<string[]> {
  "use cache";
  cacheLife("catalog");
  cacheTag(tags.products);
  return (await loadActiveProducts()).map((p) => p.slug);
}
