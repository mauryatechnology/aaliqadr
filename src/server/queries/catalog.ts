import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import type { Element, ZodiacSlug } from "@/config/zodiac";
import { db, isDatabaseConfigured } from "@/server/db/connect";
import { Product, type ProductDoc } from "@/server/models/Product";
import { Category, Collection, type CategoryDoc, type CollectionDoc } from "@/server/models/catalog";
import { SEED_CATEGORIES, SEED_COLLECTIONS, SEED_PRODUCTS } from "@/server/catalog/seed";
import { categoryTrail, matchesRules, type RuleSet } from "@/server/catalog/rules";
import { toCard, type BadgeKey, type MediaScope, type CategoryDTO, type CollectionDTO, type ProductCardDTO, type ProductDTO } from "@/server/catalog/types";

/**
 * Cached catalogue reads (docs/03 §5). Every storefront page reads through here, so most
 * pageviews cost zero database reads. Writes invalidate with updateTag / revalidateTag:
 *   "products"          any change to the catalogue list
 *   "product:{slug}"    one product page
 *   "categories"        the category tree
 *   "collections"       collections (their membership also follows "products")
 */

export const tags = {
  products: "products",
  product: (slug: string) => `product:${slug}`,
  categories: "categories",
  collections: "collections",
};

export type LeanProduct = ProductDoc & { _id: { toString(): string }; createdAt?: Date; updatedAt?: Date };

function toScope(sc: { kind?: string | null; sku?: string | null; axis?: number | null; value?: string | null } | null | undefined): MediaScope {
  if (sc?.kind === "variant" && sc.sku) return { kind: "variant", sku: sc.sku };
  if (sc?.kind === "option" && typeof sc.axis === "number" && sc.value) return { kind: "option", axis: sc.axis, value: sc.value };
  return { kind: "shared" };
}

export function fromDoc(d: LeanProduct): ProductDTO {
  return {
    id: d._id.toString(),
    slug: d.slug,
    type: d.type,
    name: d.name,
    tagline: d.tagline ?? "",
    description: d.description,
    descriptionHtml: d.descriptionHtml ?? undefined,
    categoryId: d.categoryId ? String(d.categoryId) : undefined,
    tags: d.tags ?? [],
    badges: (d.badges ?? []) as BadgeKey[],
    options: (d.options ?? []).map((o) => ({ name: o.name, values: [...o.values] })),
    specs: (d.specs ?? []).map((x) => ({ label: x.label ?? "", value: x.value ?? "" })),
    aPlus: d.aPlus ? (JSON.parse(JSON.stringify(d.aPlus)) as ProductDTO["aPlus"]) : [],
    display: { notes: d.display?.notes ?? true, profile: d.display?.profile ?? true, specs: d.display?.specs ?? true, sharedAfterVariant: d.display?.sharedAfterVariant ?? true },
    imageAxis: typeof d.imageAxis === "number" ? d.imageAxis : undefined,
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
      optionValues: v.optionValues ?? [],
      mediaIds: v.mediaIds ?? [],
      volumeMl: v.volumeMl ?? 0,
      barcode: v.barcode ?? undefined,
      mrpP: v.mrpP,
      priceP: v.priceP,
      stock: v.stock,
      lowStockThreshold: v.lowStockThreshold ?? 5,
      weightG: v.weightG,
      isActive: v.isActive ?? true,
      codAllowed: v.codAllowed ?? true,
      maxPerOrder: v.maxPerOrder ?? 5,
    })),
    media: (d.media && d.media.length > 0)
      ? d.media.map((m, i) => ({
          id: m.id ?? `m${i}`,
          kind: (m.kind ?? "image") as "image" | "video",
          scope: toScope(m.scope),
          hash: m.hash ?? undefined,
          url: m.url,
          posterUrl: m.posterUrl ?? undefined,
          alt: m.alt,
          width: m.width,
          height: m.height,
          blurDataURL: m.blurDataURL ?? undefined,
          role: (m.role ?? undefined) as ProductDTO["media"][number]["role"],
        }))
      : [
          {
            id: `bottle-${d.zodiacSign ?? "brand"}`,
            kind: "image" as const,
            scope: { kind: "shared" as const },
            url: `/bottles/${d.zodiacSign ?? "brand"}.svg`,
            alt: `${d.name} perfume bottle artwork`,
            width: 720,
            height: 1290,
          },
        ],
    legal: {
      manufacturer: d.legal?.manufacturer ?? "",
      countryOfOrigin: d.legal?.countryOfOrigin ?? "India",
      genericName: d.legal?.genericName ?? "",
    },
    hsnCode: d.hsnCode,
    gstRateBps: d.gstRateBps,
    seo: { title: d.seo?.title ?? undefined, description: d.seo?.description ?? undefined, keywords: d.seo?.keywords ?? [] },
    ratingAvg: d.ratingAvg ?? 0,
    ratingCount: d.ratingCount ?? 0,
    salesCount: d.salesCount ?? 0,
    sortOrder: d.sortOrder ?? 0,
    createdAt: (d.createdAt ?? d.updatedAt ?? new Date(0)).toISOString(),
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

// ── Categories & collections ────────────────────────────────────────────────

const image = (i?: { url?: string; alt?: string; width?: number; height?: number } | null) =>
  i?.url ? { url: i.url, alt: i.alt ?? "", width: i.width ?? 1200, height: i.height ?? 1200 } : undefined;

export function categoryFromDoc(d: CategoryDoc): CategoryDTO {
  return {
    id: String(d._id),
    slug: d.slug,
    name: d.name,
    parentId: d.parentId ? String(d.parentId) : undefined,
    description: d.description ?? "",
    image: image(d.image),
    sortOrder: d.sortOrder ?? 0,
    isActive: d.isActive ?? true,
    seo: { title: d.seo?.title ?? undefined, description: d.seo?.description ?? undefined },
  };
}

export function collectionFromDoc(d: CollectionDoc): CollectionDTO {
  return {
    id: String(d._id),
    slug: d.slug,
    name: d.name,
    description: d.description ?? "",
    kind: d.kind,
    productIds: (d.productIds ?? []).map(String),
    rules: { match: d.rules?.match ?? "all", conditions: (d.rules?.conditions ?? []) as RuleSet["conditions"] },
    image: image(d.image),
    banner: image(d.banner),
    featured: d.featured ?? false,
    sortOrder: d.sortOrder ?? 0,
    isActive: d.isActive ?? true,
    seo: { title: d.seo?.title ?? undefined, description: d.seo?.description ?? undefined },
  };
}

/** Active categories, in display order. */
export async function getCategories(): Promise<CategoryDTO[]> {
  "use cache";
  cacheLife("catalog");
  cacheTag(tags.categories);
  if (!isDatabaseConfigured()) return SEED_CATEGORIES;
  await db();
  const docs = await Category.find({ isActive: true }).sort({ sortOrder: 1, name: 1 }).lean<CategoryDoc[]>();
  return docs.map(categoryFromDoc);
}

/** Active collections, in display order. */
export async function getCollections(): Promise<CollectionDTO[]> {
  "use cache";
  cacheLife("catalog");
  cacheTag(tags.collections);
  if (!isDatabaseConfigured()) return SEED_COLLECTIONS;
  await db();
  const docs = await Collection.find({ isActive: true }).sort({ sortOrder: 1, name: 1 }).lean<CollectionDoc[]>();
  return docs.map(collectionFromDoc);
}

/** Every category id at or below `rootId`. */
export function descendantIds(categories: CategoryDTO[], rootId: string): Set<string> {
  const out = new Set([rootId]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const c of categories) {
      if (c.parentId && out.has(c.parentId) && !out.has(c.id)) {
        out.add(c.id);
        grew = true;
      }
    }
  }
  return out;
}

/** Products in a collection: manual ones in their saved order; smart ones by rule, catalogue order. */
export function collectionProducts<P extends ProductDTO>(collection: CollectionDTO, products: P[], categories: CategoryDTO[]): P[] {
  if (collection.kind === "manual") {
    const byId = new Map(products.map((p) => [p.id, p]));
    return collection.productIds.map((id) => byId.get(id)).filter((p): p is P => !!p);
  }
  const trail = categoryTrail(categories);
  return products.filter((p) => matchesRules(p, collection.rules, trail));
}

/** Cards for a collection (cached with both catalogue tags). */
export async function getCollectionCards(slug: string): Promise<{ collection: CollectionDTO; cards: ProductCardDTO[] } | null> {
  "use cache";
  cacheLife("catalog");
  cacheTag(tags.products, tags.collections, tags.categories);
  const [collections, categories, products] = await Promise.all([getCollections(), getCategories(), loadActiveProducts()]);
  const collection = collections.find((c) => c.slug === slug);
  if (!collection) return null;
  return { collection, cards: collectionProducts(collection, products, categories).map(toCard) };
}

/** Cards for a category, including its sub-categories. */
export async function getCategoryCards(slug: string): Promise<{ category: CategoryDTO; children: CategoryDTO[]; trail: CategoryDTO[]; cards: ProductCardDTO[] } | null> {
  "use cache";
  cacheLife("catalog");
  cacheTag(tags.products, tags.categories);
  const [categories, products] = await Promise.all([getCategories(), loadActiveProducts()]);
  const category = categories.find((c) => c.slug === slug);
  if (!category) return null;
  const ids = descendantIds(categories, category.id);
  const byId = new Map(categories.map((c) => [c.id, c]));
  const trail: CategoryDTO[] = [];
  for (let c = category.parentId ? byId.get(category.parentId) : undefined; c && trail.length < 6; c = c.parentId ? byId.get(c.parentId) : undefined) trail.unshift(c);
  return {
    category,
    children: categories.filter((c) => c.parentId === category.id),
    trail,
    cards: products.filter((p) => p.categoryId && ids.has(p.categoryId)).map(toCard),
  };
}
