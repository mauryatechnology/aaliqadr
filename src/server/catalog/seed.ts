import { ELEMENT_INFO, ELEMENTS, SIGNS, ZODIAC, type ZodiacSign } from "@/config/zodiac";
import { site } from "@/config/site";
import type { CategoryDTO, CollectionDTO, ProductDTO, Variant } from "./types";

/**
 * Launch catalogue. Used by `npm run db:seed` and, while MONGODB_URI is still a placeholder,
 * as the storefront's read source so pages render before the database exists.
 * Prices are placeholders until the founder confirms them.
 */

const SEED_DATE = "2026-10-22T00:00:00.000Z";

/** Category tree. Seed ids double as stable keys for the migration (scripts/db-migrate-catalog.ts). */
export const SEED_CATEGORIES: CategoryDTO[] = [
  { id: "seed-cat-perfumes", slug: "perfumes", name: "Perfumes", description: "Every Aaliqadr fragrance, from the twelve zodiac Extraits to discovery and gift sets.", sortOrder: 0, isActive: true, seo: {} },
  { id: "seed-cat-signature", slug: "zodiac-extraits", name: "Zodiac Extraits", parentId: "seed-cat-perfumes", description: "Twelve Extraits de Parfum, one composed for each sign of the zodiac.", sortOrder: 1, isActive: true, seo: {} },
  { id: "seed-cat-discovery", slug: "discovery-sets", name: "Discovery Sets", parentId: "seed-cat-perfumes", description: "Try every sign before you choose your own.", sortOrder: 2, isActive: true, seo: {} },
  { id: "seed-cat-gifts", slug: "gift-sets", name: "Gift Sets", parentId: "seed-cat-perfumes", description: "Element trios and boxed sets, ready to give.", sortOrder: 3, isActive: true, seo: {} },
];

const rule = (field: CollectionDTO["rules"]["conditions"][number]["field"], value: string) => ({ field, op: "equals" as const, value });

export const SEED_COLLECTIONS: CollectionDTO[] = [
  ...ELEMENTS.map((el, i) => ({
    id: `seed-col-${el}`,
    slug: `${el}-signs`,
    name: `${ELEMENT_INFO[el].label} Signs`,
    description: `${ELEMENT_INFO[el].scent}. Fragrances for ${ELEMENT_INFO[el].signs.map((s) => ZODIAC[s].name).join(", ")}.`,
    kind: "smart" as const,
    productIds: [],
    rules: { match: "all" as const, conditions: [rule("element", el)] },
    featured: true,
    sortOrder: i,
    isActive: true,
    seo: {},
  })),
  {
    id: "seed-col-gifting",
    slug: "gifting",
    name: "The Gifting Edit",
    description: "Discovery coffrets and element trios, boxed and ready to give.",
    kind: "smart",
    productIds: [],
    rules: { match: "any", conditions: [rule("type", "gift_set"), rule("type", "bundle")] },
    featured: true,
    sortOrder: 10,
    isActive: true,
    seo: {},
  },
  {
    id: "seed-col-bestsellers",
    slug: "bestsellers",
    name: "Bestsellers",
    description: "The signs our customers come back to.",
    kind: "smart",
    productIds: [],
    rules: { match: "all", conditions: [rule("badge", "bestseller")] },
    featured: false,
    sortOrder: 11,
    isActive: true,
    seo: {},
  },
];

/** HSN master. ⚖️ Confirm the 8-digit codes and rates with the CA before launch (docs/14). */
export const SEED_HSN = [
  { code: "33030050", description: "Perfumes and toilet waters (spirit-based perfume)", gstRateBps: 1800 },
  { code: "33030010", description: "Perfumes and toilet waters: other perfumes", gstRateBps: 1800 },
  { code: "33079090", description: "Other perfumery and toilet preparations", gstRateBps: 1800 },
  { code: "33049990", description: "Beauty and skin-care preparations (body lotion, butter)", gstRateBps: 1800 },
  { code: "42029900", description: "Cases and pouches (travel atomiser cases)", gstRateBps: 1800 },
];

/** Defaults for the catalogue fields added in the catalogue expansion. */
const extras = (categoryId: string, badges: ProductDTO["badges"] = [], tags: string[] = []) => ({
  categoryId,
  tags,
  badges,
  options: [] as ProductDTO["options"],
  specs: [] as ProductDTO["specs"],
  aPlus: [] as ProductDTO["aPlus"],
  display: { notes: true, profile: true, specs: true },
  createdAt: SEED_DATE,
});

const legal = {
  manufacturer: `${site.legal.legalName}, ${site.legal.city}, ${site.legal.state}`,
  countryOfOrigin: "India",
  genericName: "Extrait de Parfum",
};

const LONGEVITY: Record<1 | 2 | 3 | 4 | 5, [number, number]> = { 1: [3, 4], 2: [4, 6], 3: [6, 8], 4: [8, 10], 5: [10, 12] };

function code(sign: ZodiacSign) {
  return sign.slug.slice(0, 3).toUpperCase();
}

function fragranceVariants(sign: ZodiacSign): Variant[] {
  const base = { lowStockThreshold: 5, isActive: true, codAllowed: true, maxPerOrder: 5, mediaIds: [] };
  return [
    { ...base, sku: `AQ-${code(sign)}-10`, label: "10 ml", optionValues: ["10 ml"], volumeMl: 10, mrpP: 129900, priceP: 119900, stock: 40, weightG: 120 },
    { ...base, sku: `AQ-${code(sign)}-50`, label: "50 ml", optionValues: ["50 ml"], volumeMl: 50, mrpP: 399900, priceP: 349900, stock: 25, weightG: 380 },
    { ...base, sku: `AQ-${code(sign)}-100`, label: "100 ml", optionValues: ["100 ml"], volumeMl: 100, mrpP: 599900, priceP: 549900, stock: 12, weightG: 620 },
  ];
}

function fragrance(sign: ZodiacSign): ProductDTO {
  const f = sign.fragrance;
  const families = [...new Set([...f.notes.top, ...f.notes.heart, ...f.notes.base].map((x) => x.family))];
  const night = f.intensity >= 4;
  return {
    id: `seed-${sign.slug}`,
    slug: f.slug,
    type: "fragrance",
    ...extras("seed-cat-signature", sign.index <= 3 ? ["bestseller"] : [], [sign.element, sign.name.toLowerCase(), sign.rashi.toLowerCase(), "extrait"]),
    options: [{ name: "Size", values: ["10 ml", "50 ml", "100 ml"] }],
    name: f.name,
    tagline: f.tagline,
    description:
      `${f.name} is Aaliqadr's signature Extrait de Parfum for ${sign.name} (${sign.rashi}). ` +
      `It opens with ${f.notes.top.map((x) => x.name.toLowerCase()).join(" and ")}, ` +
      `settles into a heart of ${f.notes.heart.map((x) => x.name.toLowerCase()).join(", ")}, ` +
      `and dries down to ${f.notes.base.map((x) => x.name.toLowerCase()).join(" and ")}. ` +
      `Crafted for the ${sign.traits.slice(0, 2).join(" and ").toLowerCase()} spirit of the ${sign.element} sign ruled by ${sign.rulingPlanet}.`,
    zodiacSign: sign.slug,
    element: sign.element,
    concentration: "extrait",
    notes: f.notes,
    noteFamilies: families,
    profile: {
      intensity: f.intensity,
      longevityHours: LONGEVITY[f.intensity],
      sillage: f.intensity,
      season: night ? ["Autumn", "Winter"] : ["Spring", "Summer"],
      timeOfDay: night ? ["night"] : ["day", "night"],
    },
    howToWear:
      "Spray on pulse points from 15 cm: wrists, neck and behind the ears. Let it dry; never rub. Layer over unscented moisturiser for longer wear.",
    compatibleSigns: sign.compatible,
    variants: fragranceVariants(sign),
    media: [],
    legal,
    hsnCode: "33030050",
    gstRateBps: 1800,
    seo: {},
    ratingAvg: 0,
    ratingCount: 0,
    salesCount: 13 - sign.index,
    sortOrder: sign.index,
    updatedAt: SEED_DATE,
  };
}

const discoveryCoffret: ProductDTO = {
  id: "seed-discovery-coffret",
  slug: "zodiac-discovery-coffret",
  type: "bundle",
  ...extras("seed-cat-discovery", ["gift", "bestseller"], ["discovery", "sampler", "all signs"]),
  name: "Zodiac Discovery Coffret",
  tagline: "All twelve signs, 2 ml each: find the one written in your stars",
  description:
    "Twelve 2 ml vials of every Aaliqadr signature, arranged as the zodiac wheel in a keepsake coffret. Wear one sign a day and let your skin decide.",
  noteFamilies: [],
  includes: SIGNS.map((s) => ({ name: `${s.glyph} ${s.fragrance.name}`, detail: `${s.name} · 2 ml` })),
  variants: [
    { sku: "AQ-DSC-24", label: "12 × 2 ml", optionValues: [], mediaIds: [], volumeMl: 24, mrpP: 219900, priceP: 199900, stock: 60, lowStockThreshold: 10, weightG: 320, isActive: true, codAllowed: false, maxPerOrder: 3 },
  ],
  media: [],
  legal,
  hsnCode: "33030050",
  gstRateBps: 1800,
  seo: {},
  ratingAvg: 0,
  ratingCount: 0,
  salesCount: 20,
  sortOrder: 0,
  updatedAt: SEED_DATE,
};

const elementTrios: ProductDTO[] = ELEMENTS.map((el, i) => {
  const info = ELEMENT_INFO[el];
  return {
    id: `seed-trio-${el}`,
    slug: `${el}-element-trio`,
    type: "gift_set",
    ...extras("seed-cat-gifts", ["gift"], [el, "trio", "gift"]),
    name: `${info.label} Element Trio`,
    tagline: `${info.scent}: the three ${info.label.toLowerCase()} signs, together`,
    description: `Three 10 ml Extraits for the ${info.label.toLowerCase()} signs (${info.signs.map((s) => ZODIAC[s].name).join(", ")}). A gift for anyone born under ${info.label.toLowerCase()}.`,
    element: el,
    noteFamilies: [],
    includes: info.signs.map((s) => ({ name: `${ZODIAC[s].glyph} ${ZODIAC[s].fragrance.name}`, detail: `${ZODIAC[s].name} · 10 ml` })),
    variants: [
      { sku: `AQ-TRI-${el.slice(0, 3).toUpperCase()}`, label: "3 × 10 ml", optionValues: [], mediaIds: [], volumeMl: 30, mrpP: 349900, priceP: 299900, stock: 20, lowStockThreshold: 5, weightG: 420, isActive: true, codAllowed: true, maxPerOrder: 3 },
    ],
    media: [],
    legal,
    hsnCode: "33030050",
    gstRateBps: 1800,
    seo: {},
    ratingAvg: 0,
    ratingCount: 0,
    salesCount: 4 - i,
    sortOrder: 20 + i,
    updatedAt: SEED_DATE,
  };
});

export const SEED_PRODUCTS: ProductDTO[] = [...SIGNS.map(fragrance), discoveryCoffret, ...elementTrios];
