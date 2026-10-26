/**
 * Faceted filtering for product listings (plan.md §9.3). Pure: the server computes results and
 * counts from the cached catalogue; nothing is filtered in the browser.
 *
 * Within a facet values are OR'd, across facets AND'd. Each facet's counts are worked out with
 * every *other* facet applied, so a count says what you'd get by ticking that value.
 */

export interface FacetCard {
  id: string;
  categoryId?: string;
  zodiacSign?: string;
  element?: string;
  noteFamilies: string[];
  concentration?: string;
  sizesMl: number[];
  type: string;
  fromPriceP: number;
  fromMrpP: number;
  ratingAvg: number;
  ratingCount: number;
  inStock: boolean;
  badges: string[];
  salesCount: number;
  createdAt: string;
  sortOrder: number;
}

export const FACET_KEYS = ["category", "sign", "element", "family", "conc", "size", "price", "rating", "stock", "badge", "offer"] as const;
export type FacetKey = (typeof FACET_KEYS)[number];
export type FacetState = Partial<Record<FacetKey, string[]>>;

export const PRICE_BUCKETS = [
  { value: "u1500", label: "Under ₹1,500", test: (p: number) => p < 150000 },
  { value: "1500-3000", label: "₹1,500 – ₹3,000", test: (p: number) => p >= 150000 && p <= 300000 },
  { value: "3000+", label: "Above ₹3,000", test: (p: number) => p > 300000 },
] as const;

export const SIZE_BUCKETS = [
  { value: "mini", label: "Minis (≤ 10 ml)", test: (ml: number) => ml > 0 && ml <= 10 },
  { value: "50", label: "50 ml", test: (ml: number) => ml > 10 && ml <= 60 },
  { value: "100", label: "100 ml", test: (ml: number) => ml > 60 },
] as const;

export const SORTS = [
  { value: "", label: "Featured" },
  { value: "bestselling", label: "Bestselling" },
  { value: "newest", label: "Newest" },
  { value: "price-asc", label: "Price: low to high" },
  { value: "price-desc", label: "Price: high to low" },
  { value: "rating", label: "Top rated" },
  { value: "saving", label: "Biggest saving" },
] as const;

/** Reads facet values from the query string (comma-separated, unknown keys ignored). */
export function parseFacets(sp: Record<string, string | string[] | undefined>): FacetState {
  const out: FacetState = {};
  for (const k of FACET_KEYS) {
    const raw = sp[k];
    const v = (Array.isArray(raw) ? raw[0] : raw) ?? "";
    const vals = v.split(",").map((x) => x.trim().slice(0, 40)).filter(Boolean).slice(0, 20);
    if (vals.length) out[k] = vals;
  }
  return out;
}

export interface FacetContext {
  /** Category slug → ids of it and its descendants. */
  categoryIds: (slug: string) => Set<string> | undefined;
}

function matches(c: FacetCard, key: FacetKey, values: string[], ctx: FacetContext): boolean {
  switch (key) {
    case "category":
      return values.some((slug) => !!c.categoryId && !!ctx.categoryIds(slug)?.has(c.categoryId));
    case "sign":
      return !!c.zodiacSign && values.includes(c.zodiacSign);
    case "element":
      return !!c.element && values.includes(c.element);
    case "family":
      return c.noteFamilies.some((f) => values.includes(f));
    case "conc":
      return !!c.concentration && values.includes(c.concentration);
    case "size":
      return values.some((v) => (v === "set" ? c.type === "bundle" || c.type === "gift_set" : c.sizesMl.some((ml) => SIZE_BUCKETS.find((b) => b.value === v)?.test(ml))));
    case "price":
      return values.some((v) => {
        const bucket = PRICE_BUCKETS.find((b) => b.value === v);
        if (bucket) return bucket.test(c.fromPriceP);
        const m = /^(\d*)-(\d*)$/.exec(v);
        if (!m) return true;
        const lo = m[1] ? Number(m[1]) * 100 : 0;
        const hi = m[2] ? Number(m[2]) * 100 : Infinity;
        return c.fromPriceP >= lo && c.fromPriceP <= hi;
      });
    case "rating":
      return c.ratingCount > 0 && c.ratingAvg >= Number(values[0] ?? 0);
    case "stock":
      return c.inStock;
    case "badge":
      return c.badges.some((b) => values.includes(b));
    case "offer":
      return c.fromMrpP > c.fromPriceP;
  }
}

export function applyFacets<T extends FacetCard>(cards: T[], state: FacetState, ctx: FacetContext, except?: FacetKey): T[] {
  const active = (Object.entries(state) as [FacetKey, string[]][]).filter(([k, v]) => k !== except && v.length);
  return cards.filter((c) => active.every(([k, v]) => matches(c, k, v, ctx)));
}

/** Count of results each value would give, with the other facets applied. */
export function facetCounts(cards: FacetCard[], state: FacetState, ctx: FacetContext, key: FacetKey, values: string[]): Record<string, number> {
  const base = applyFacets(cards, state, ctx, key);
  return Object.fromEntries(values.map((v) => [v, base.filter((c) => matches(c, key, [v], ctx)).length]));
}

export function sortCards<T extends FacetCard>(cards: T[], sort: string): T[] {
  const saving = (c: FacetCard) => (c.fromMrpP > 0 ? (c.fromMrpP - c.fromPriceP) / c.fromMrpP : 0);
  return cards.toSorted((a, b) => {
    switch (sort) {
      case "bestselling":
        return b.salesCount - a.salesCount;
      case "newest":
        return b.createdAt.localeCompare(a.createdAt);
      case "price-asc":
        return a.fromPriceP - b.fromPriceP;
      case "price-desc":
        return b.fromPriceP - a.fromPriceP;
      case "rating":
        return b.ratingAvg - a.ratingAvg || b.ratingCount - a.ratingCount;
      case "saving":
        return saving(b) - saving(a);
      default:
        return a.sortOrder - b.sortOrder;
    }
  });
}

/** Facets that only narrow a landing page (category/sign/element) may be indexed; the rest not. */
export const isIndexable = (state: FacetState, sort: string, page: number) =>
  !sort && page <= 1 && (Object.keys(state) as FacetKey[]).every((k) => ["category", "sign", "element"].includes(k) && (state[k]?.length ?? 0) <= 1) && Object.keys(state).length <= 1;

/** A query string with one facet value toggled (page reset). */
export function toggleHref(base: string, sp: URLSearchParams, key: string, value: string, single = false): string {
  const next = new URLSearchParams(sp);
  const cur = (next.get(key) ?? "").split(",").filter(Boolean);
  const on = cur.includes(value);
  const vals = single ? (on ? [] : [value]) : on ? cur.filter((v) => v !== value) : [...cur, value];
  if (vals.length) next.set(key, vals.join(","));
  else next.delete(key);
  next.delete("page");
  const q = next.toString();
  return `${base}${q ? `?${q}` : ""}`;
}
