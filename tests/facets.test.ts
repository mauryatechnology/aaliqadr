import { describe, expect, it } from "vitest";
import { applyFacets, facetCounts, isIndexable, parseFacets, sortCards, toggleHref, type FacetCard, type FacetContext } from "@/lib/facets";

const card = (p: Partial<FacetCard> & { id: string }): FacetCard => ({ noteFamilies: [], sizesMl: [50], type: "fragrance", fromPriceP: 249900, fromMrpP: 249900, ratingAvg: 0, ratingCount: 0, inStock: true, badges: [], salesCount: 0, createdAt: "2026-01-01", sortOrder: 0, ...p });

const cards = [
  card({ id: "a", zodiacSign: "aries", element: "fire", noteFamilies: ["spicy", "amber"], fromPriceP: 120000, fromMrpP: 150000, categoryId: "c1", ratingAvg: 4.6, ratingCount: 10, sizesMl: [10, 50] }),
  card({ id: "b", zodiacSign: "taurus", element: "earth", noteFamilies: ["floral", "woody"], fromPriceP: 249900, categoryId: "c1" }),
  card({ id: "c", zodiacSign: "leo", element: "fire", noteFamilies: ["woody"], fromPriceP: 350000, inStock: false, categoryId: "c2", sizesMl: [100] }),
  card({ id: "d", type: "bundle", fromPriceP: 199900, fromMrpP: 199900, sizesMl: [2], categoryId: "c2" }),
];
const ctx: FacetContext = { categoryIds: (slug) => (slug === "all" ? new Set(["c1", "c2"]) : slug === "sig" ? new Set(["c1"]) : undefined) };
const ids = (xs: FacetCard[]) => xs.map((x) => x.id);

describe("facets", () => {
  it("parses the query string", () => {
    expect(parseFacets({ family: "woody,floral", junk: "x", price: "" })).toEqual({ family: ["woody", "floral"] });
  });

  it("ORs within a facet and ANDs across facets", () => {
    expect(ids(applyFacets(cards, { family: ["woody", "spicy"] }, ctx))).toEqual(["a", "b", "c"]);
    expect(ids(applyFacets(cards, { family: ["woody", "spicy"], element: ["fire"] }, ctx))).toEqual(["a", "c"]);
  });

  it("filters by price bucket, custom range, size, rating, stock and offer", () => {
    expect(ids(applyFacets(cards, { price: ["u1500"] }, ctx))).toEqual(["a"]);
    expect(ids(applyFacets(cards, { price: ["2000-3000"] }, ctx))).toEqual(["b"]);
    expect(ids(applyFacets(cards, { size: ["mini"] }, ctx))).toEqual(["a", "d"]);
    expect(ids(applyFacets(cards, { size: ["set"] }, ctx))).toEqual(["d"]);
    expect(ids(applyFacets(cards, { rating: ["4"] }, ctx))).toEqual(["a"]);
    expect(ids(applyFacets(cards, { stock: ["in"] }, ctx))).toEqual(["a", "b", "d"]);
    expect(ids(applyFacets(cards, { offer: ["yes"] }, ctx))).toEqual(["a"]);
    expect(ids(applyFacets(cards, { category: ["sig"] }, ctx))).toEqual(["a", "b"]);
  });

  it("counts each value with the other facets applied", () => {
    const counts = facetCounts(cards, { element: ["fire"], family: ["woody"] }, ctx, "family", ["woody", "spicy", "floral"]);
    expect(counts).toEqual({ woody: 1, spicy: 1, floral: 0 });
  });

  it("sorts", () => {
    expect(ids(sortCards(cards, "price-asc"))).toEqual(["a", "d", "b", "c"]);
    expect(ids(sortCards(cards, "saving"))[0]).toBe("a");
  });

  it("indexes only simple landing pages", () => {
    expect(isIndexable({}, "", 1)).toBe(true);
    expect(isIndexable({ element: ["fire"] }, "", 1)).toBe(true);
    expect(isIndexable({ element: ["fire"], family: ["woody"] }, "", 1)).toBe(false);
    expect(isIndexable({}, "price-asc", 1)).toBe(false);
    expect(isIndexable({}, "", 2)).toBe(false);
  });

  it("toggles a value and resets paging", () => {
    expect(toggleHref("/shop", new URLSearchParams("family=woody&page=3"), "family", "floral")).toBe("/shop?family=woody%2Cfloral");
    expect(toggleHref("/shop", new URLSearchParams("family=woody"), "family", "woody")).toBe("/shop");
  });
});
