import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { ZODIAC, SIGNS } from "@/config/zodiac";
import { buildIndex, didYouMean, normalise, search, type SearchDoc, type SearchIndex } from "@/lib/search-engine";
import { getAllProducts, getCategories, getCollections, getProductCards, tags } from "@/server/queries/catalog";
import { engagementTags, getContent } from "@/server/queries/engagement";
import type { ProductCardDTO } from "@/server/catalog/types";

/** Storefront search over the cached catalogue (plan.md §9.2): no database read per query. */

async function searchDocs(): Promise<{ docs: SearchDoc[]; synonyms: string[][] }> {
  "use cache";
  cacheLife("catalog");
  cacheTag(tags.products, tags.categories, engagementTags.content);
  const [products, categories, content] = await Promise.all([getAllProducts(), getCategories(), getContent()]);
  const catName = new Map(categories.map((c) => [c.id, c.name]));
  return {
    synonyms: content.search.synonyms,
    docs: products.map((p) => {
      const sign = p.zodiacSign ? ZODIAC[p.zodiacSign] : undefined;
      return {
        id: p.id,
        name: p.name,
        sign: sign ? `${sign.name} ${sign.rashi} ${sign.element} ${sign.rulingPlanet}` : (p.element ?? ""),
        tags: [...p.tags, ...p.badges, p.type.replace("_", " "), p.concentration ?? ""].join(" "),
        notes: p.notes ? [...p.notes.top, ...p.notes.heart, ...p.notes.base].map((n) => `${n.name} ${n.family}`).join(" ") : p.noteFamilies.join(" "),
        category: p.categoryId ? (catName.get(p.categoryId) ?? "") : "",
        description: `${p.tagline} ${p.description}`,
        inStock: p.variants.some((v) => v.isActive && v.stock > 0),
        salesCount: p.salesCount,
        ratingAvg: p.ratingAvg,
      };
    }),
  };
}

// The index is rebuilt only when the cached documents change (keyed by a hash of their content).
let memo: { key: number; index: SearchIndex } | null = null;
function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}
async function getIndex(): Promise<SearchIndex> {
  const data = await searchDocs();
  const key = hash(JSON.stringify(data));
  if (!memo || memo.key !== key) memo = { key, index: buildIndex(data.docs, data.synonyms) };
  return memo.index;
}

export async function searchProductCards(q: string): Promise<{ cards: ProductCardDTO[]; suggestion: string | null }> {
  const [index, cards] = await Promise.all([getIndex(), getProductCards()]);
  const hits = search(index, q);
  const byId = new Map(cards.map((c) => [c.id, c]));
  const found = hits.map((h) => byId.get(h.id)).filter((c): c is ProductCardDTO => !!c);
  return { cards: found, suggestion: found.length ? null : didYouMean(index, q) };
}

export interface Suggestions {
  products: { slug: string; name: string; image?: string; priceP: number; sign?: string }[];
  categories: { slug: string; name: string }[];
  collections: { slug: string; name: string }[];
  signs: { slug: string; name: string; rashi: string }[];
  notes: string[];
  suggestion: string | null;
}

/** Instant results for the search overlay. */
export async function searchSuggestions(q: string): Promise<Suggestions> {
  const t = normalise(q);
  const [{ cards, suggestion }, categories, collections, products] = await Promise.all([searchProductCards(q), getCategories(), getCollections(), getAllProducts()]);
  const has = (s: string) => normalise(s).includes(t);
  const notes = [...new Set(products.flatMap((p) => (p.notes ? [...p.notes.top, ...p.notes.heart, ...p.notes.base].map((n) => n.name) : [])))];
  return {
    products: cards.slice(0, 6).map((c) => ({ slug: c.slug, name: c.name, image: c.media[0]?.url, priceP: c.fromPriceP, sign: c.zodiacSign })),
    categories: categories.filter((c) => has(c.name)).slice(0, 3).map((c) => ({ slug: c.slug, name: c.name })),
    collections: collections.filter((c) => has(c.name)).slice(0, 3).map((c) => ({ slug: c.slug, name: c.name })),
    signs: SIGNS.filter((s) => has(s.name) || has(s.rashi)).slice(0, 3).map((s) => ({ slug: s.slug, name: s.name, rashi: s.rashi })),
    notes: notes.filter((n) => has(n)).slice(0, 5),
    suggestion,
  };
}
