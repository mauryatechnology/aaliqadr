import { describe, expect, it } from "vitest";
import { SEED_CATEGORIES, SEED_COLLECTIONS, SEED_PRODUCTS } from "@/server/catalog/seed";
import { categoryTrail, matchesRules } from "@/server/catalog/rules";
import { htmlToText, sanitizeRich, textToHtml } from "@/server/catalog/rich-text";
import { productCode, SKU_RE, skuPart, suggestSku } from "@/lib/sku";
import { combinations, isAvailable, labelFor, resolveVariant, variantKey } from "@/lib/variants";
import { csvRecords, parseCsv, toCsv } from "@/lib/csv";
import { productInput } from "@/schemas/product";

describe("SKUs", () => {
  it("accepts the launch SKUs and two-option SKUs", () => {
    for (const p of SEED_PRODUCTS) for (const v of p.variants) expect(SKU_RE.test(v.sku), v.sku).toBe(true);
    expect(SKU_RE.test("AQ-VEBM-100-GFT")).toBe(true);
    expect(SKU_RE.test("AQ-ARI")).toBe(false);
    expect(SKU_RE.test("aq-ari-50")).toBe(false);
  });

  it("derives readable codes", () => {
    expect(skuPart("50 ml")).toBe("50");
    expect(skuPart("Rose Gold")).toBe("RG");
    expect(productCode("Ember Crown")).toBe("ECX");
    expect(productCode("Velvet Earth Body Mist")).toBe("VEBM");
    expect(suggestSku("EMC", ["100 ml", "Gift Box"])).toBe("AQ-EMC-100-GB");
    expect(SKU_RE.test(suggestSku(productCode("Oud"), ["Classic"]))).toBe(true);
  });
});

describe("variant options", () => {
  const variants = [
    { optionValues: ["10 ml", "Classic"], isActive: true, sku: "A" },
    { optionValues: ["50 ml", "Classic"], isActive: true, sku: "B" },
    { optionValues: ["50 ml", "Gift box"], isActive: true, sku: "C" },
    { optionValues: ["10 ml", "Gift box"], isActive: false, sku: "D" },
  ];

  it("builds every combination in axis order", () => {
    expect(combinations([{ name: "Size", values: ["10 ml", "50 ml"] }, { name: "Box", values: ["Classic", "Gift"] }])).toEqual([
      ["10 ml", "Classic"],
      ["10 ml", "Gift"],
      ["50 ml", "Classic"],
      ["50 ml", "Gift"],
    ]);
    expect(combinations([])).toEqual([[]]);
    expect(variantKey(["50 ML ", "Gift"])).toBe("50 ml|gift");
    expect(labelFor(["50 ml", "Gift"])).toBe("50 ml · Gift");
  });

  it("knows which values can be picked and resolves the closest variant", () => {
    expect(isAvailable(variants, 1, "Gift box", ["10 ml"])).toBe(false); // only the inactive one
    expect(isAvailable(variants, 1, "Gift box", ["50 ml"])).toBe(true);
    expect(resolveVariant(variants, ["50 ml", "Gift box"])?.sku).toBe("C");
    // Switching size keeps the size and falls back on the other axis.
    expect(resolveVariant(variants, ["10 ml", "Gift box"], 0)?.sku).toBe("A");
  });
});

describe("smart collections", () => {
  const trail = categoryTrail(SEED_CATEGORIES);
  const names = (slug: string) => SEED_PRODUCTS.filter((p) => matchesRules(p, SEED_COLLECTIONS.find((c) => c.slug === slug)!.rules, trail)).map((p) => p.slug);

  it("matches by element, type and badge", () => {
    expect(names("fire-signs")).toEqual(expect.arrayContaining(["ember-crown-aries", "fire-element-trio"]));
    expect(names("fire-signs")).not.toContain("moon-tide-cancer");
    expect(names("gifting")).toEqual(expect.arrayContaining(["zodiac-discovery-coffret", "air-element-trio"]));
    expect(names("bestsellers").length).toBeGreaterThan(0);
  });

  it("category rules include sub-categories, numeric rules compare numbers", () => {
    const anyPerfume = { match: "all" as const, conditions: [{ field: "category" as const, op: "equals" as const, value: "perfumes" }] };
    expect(SEED_PRODUCTS.every((p) => matchesRules(p, anyPerfume, trail))).toBe(true);
    const under2k = { match: "all" as const, conditions: [{ field: "price" as const, op: "less_than" as const, value: "2000" }] };
    expect(SEED_PRODUCTS.filter((p) => matchesRules(p, under2k, trail)).every((p) => Math.min(...p.variants.map((v) => v.priceP)) < 200000)).toBe(true);
    expect(matchesRules(SEED_PRODUCTS[0]!, { match: "any", conditions: [] }, trail)).toBe(false);
  });
});

describe("CSV", () => {
  it("round-trips quotes, commas and newlines", () => {
    const csv = toCsv(["name", "note"], [["Moon, Tide", 'He said "hi"\nbye']]);
    expect(csvRecords(csv)).toEqual([{ name: "Moon, Tide", note: 'He said "hi"\nbye' }]);
  });

  it("neutralises spreadsheet formulas but keeps negative numbers", () => {
    expect(toCsv(["a"], [["=HYPERLINK(1)"]])).toContain("'=HYPERLINK");
    expect(parseCsv(toCsv(["delta"], [["-2"]]))[1]).toEqual(["-2"]);
  });
});

describe("rich text", () => {
  it("keeps formatting, drops scripts and unsafe links", () => {
    const out = sanitizeRich('<h2>Story</h2><p onclick="x()">Hi <b>bold</b><script>alert(1)</script> <a href="javascript:alert(1)">x</a> <a href="https://aaliqadr.com">ok</a></p><img src=x onerror=1>');
    expect(out).toContain("<h3>Story</h3>");
    expect(out).toContain("<strong>bold</strong>");
    expect(out).not.toMatch(/script|onclick|onerror|javascript|<img/);
    expect(out).toContain('href="https://aaliqadr.com"');
    expect(out).toContain('rel="nofollow noopener"');
  });

  it("converts to plain text and back", () => {
    expect(htmlToText("<p>One &amp; two</p><ul><li>three</li></ul>")).toBe("One & two three");
    expect(textToHtml("a < b\n\nnext")).toBe("<p>a &lt; b</p><p>next</p>");
  });
});

describe("product input", () => {
  const base = {
    name: "Test Mist",
    slug: "test-mist",
    type: "body_care",
    status: "draft",
    categoryId: "6adaee33caea79920ce59a75",
    collectionIds: [],
    tags: [],
    badges: [],
    tagline: "",
    descriptionHtml: "<p>A light body mist for warm days.</p>",
    howToWear: "",
    notes: { top: [], heart: [], base: [] },
    options: [{ name: "Size", values: ["50 ml", "100 ml"] }],
    media: [],
    specs: [],
    aPlus: [],
    display: { notes: true, profile: true, specs: true },
    manufacturer: "Aaliqadr, Bhopal",
    packer: "",
    countryOfOrigin: "India",
    genericName: "Body mist",
    hsnCode: "33079090",
    seoTitle: "",
    seoDescription: "",
    seoKeywords: [],
    sortOrder: 1,
  };
  const variant = (sku: string, size: string) => ({ sku, optionValues: [size], label: size, volumeMl: 50, mrp: 900, price: 800, weightG: 200, dimensionsCm: { l: 0, b: 0, h: 0 }, barcode: "", lowStockThreshold: 5, maxPerOrder: 5, codAllowed: true, isActive: true, mediaIds: [], initialStock: 10 });

  it("accepts one variant per combination", () => {
    expect(productInput.safeParse({ ...base, variants: [variant("AQ-TMS-50", "50 ml"), variant("AQ-TMS-100", "100 ml")] }).success).toBe(true);
  });

  it("rejects duplicate combinations, unknown values and price above MRP", () => {
    expect(productInput.safeParse({ ...base, variants: [variant("AQ-TMS-50", "50 ml"), variant("AQ-TMS-51", "50 ml")] }).success).toBe(false);
    expect(productInput.safeParse({ ...base, variants: [variant("AQ-TMS-75", "75 ml")] }).success).toBe(false);
    expect(productInput.safeParse({ ...base, variants: [{ ...variant("AQ-TMS-50", "50 ml"), price: 1000 }] }).success).toBe(false);
  });

  it("requires a sign for fragrances and an image as the cover", () => {
    expect(productInput.safeParse({ ...base, type: "fragrance", variants: [variant("AQ-TMS-50", "50 ml")] }).success).toBe(false);
    const video = { id: "v1", kind: "video", url: "https://x.public.blob.vercel-storage.com/a.mp4", alt: "A video", width: 1080, height: 1350 };
    expect(productInput.safeParse({ ...base, media: [video], variants: [variant("AQ-TMS-50", "50 ml")] }).success).toBe(false);
  });
});
