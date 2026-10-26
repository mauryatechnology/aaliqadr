import { describe, expect, it } from "vitest";
import { buildIndex, didYouMean, distance, normalise, search, stem, type SearchDoc } from "@/lib/search-engine";

const doc = (p: Partial<SearchDoc> & { id: string; name: string }): SearchDoc => ({ sign: "", tags: "", notes: "", category: "", description: "", inStock: true, salesCount: 0, ratingAvg: 0, ...p });

const index = buildIndex([
  doc({ id: "aries", name: "Ember Crown", sign: "Aries Mesh fire", notes: "saffron spicy pink pepper amber", category: "Zodiac Extraits" }),
  doc({ id: "taurus", name: "Velvet Earth", sign: "Taurus Vrishabh earth", notes: "rose floral sandalwood woody", category: "Zodiac Extraits" }),
  doc({ id: "scorpio", name: "Noir Abyss", sign: "Scorpio Vrishchik water", notes: "oud woody incense", category: "Zodiac Extraits", salesCount: 50 }),
  doc({ id: "trio", name: "Fire Element Trio", sign: "fire", notes: "", category: "Discovery", description: "Aries, Leo and Sagittarius minis", inStock: false }),
]);

describe("search engine", () => {
  it("normalises and stems", () => {
    expect(normalise("Crème  Brûlée!")).toBe("creme brulee");
    expect(stem("woods")).toBe("wood");
    expect(stem("notes")).toBe("note");
    expect(stem("citrus")).toBe("citrus");
  });

  it("bounds edit distance", () => {
    expect(distance("ember", "embr", 1)).toBe(1);
    expect(distance("crown", "crwn", 1)).toBe(1);
    expect(distance("aries", "scorpio", 2)).toBe(3);
  });

  it("finds a sign by its rashi name", () => {
    expect(search(index, "mesh")[0]?.id).toBe("aries");
    expect(search(index, "vrishabh")[0]?.id).toBe("taurus");
  });

  it("maps Hindi notes to English", () => {
    expect(search(index, "kesar")[0]?.id).toBe("aries");
    expect(search(index, "chandan")[0]?.id).toBe("taurus");
    expect(search(index, "gulab")[0]?.id).toBe("taurus");
  });

  it("tolerates typos", () => {
    expect(search(index, "embr crwn")[0]?.id).toBe("aries");
    expect(search(index, "sandalwod")[0]?.id).toBe("taurus");
  });

  it("requires every word to match", () => {
    expect(search(index, "rose oud")).toEqual([]);
    expect(search(index, "oud woody").map((h) => h.id)).toEqual(["scorpio"]);
  });

  it("ranks name above description", () => {
    const ids = search(index, "fire").map((h) => h.id);
    expect(ids[0]).toBe("trio");
  });

  it("uses store synonyms", () => {
    const custom = buildIndex([doc({ id: "x", name: "Night Bloom", notes: "tuberose" })], [["rajnigandha", "tuberose"]]);
    expect(search(custom, "rajnigandha")[0]?.id).toBe("x");
  });

  it("suggests a correction", () => {
    expect(didYouMean(index, "safron")).toBe("saffron");
    expect(didYouMean(index, "ember")).toBeNull();
  });
});
