import { coverFor } from "@/lib/variant-media";
import type { Element, Note, ZodiacSlug } from "@/config/zodiac";
import type { Paise } from "@/lib/money";
import type { ProductOption } from "@/lib/variants";
import type { RuleSet } from "./rules";

export const PRODUCT_TYPES = ["fragrance", "bundle", "gift_set", "body_care", "accessory"] as const;
export type ProductType = (typeof PRODUCT_TYPES)[number];

export const TYPE_LABEL: Record<ProductType, string> = {
  fragrance: "Signature fragrance",
  bundle: "Bundle / discovery",
  gift_set: "Gift set",
  body_care: "Body care",
  accessory: "Accessory",
};

/** Merchandising badges shown on cards and product pages. */
export const BADGES = { new: "New", bestseller: "Bestseller", limited: "Limited edition", exclusive: "Online exclusive", gift: "Perfect gift", back_in_stock: "Back in stock" } as const;
export type BadgeKey = keyof typeof BADGES;

export interface Variant {
  sku: string;
  label: string;
  /** One value per product option, in option order (empty when the product has no options). */
  optionValues: string[];
  /** Gallery media shown first when this variant is selected. */
  mediaIds: string[];
  /** Net volume in ml for fragrances; 0 when not applicable. */
  volumeMl: number;
  barcode?: string;
  mrpP: Paise;
  priceP: Paise;
  stock: number;
  lowStockThreshold: number;
  weightG: number;
  isActive: boolean;
  codAllowed: boolean;
  maxPerOrder: number;
}

/**
 * Who an image belongs to (plan.md §8.3): every variant (shared), one variant, or every variant
 * with a given value on the product's image axis (e.g. all "Gift box" sizes).
 */
export type MediaScope = { kind: "shared" } | { kind: "variant"; sku: string } | { kind: "option"; axis: number; value: string };

export interface MediaItem {
  id: string;
  kind: "image" | "video";
  scope: MediaScope;
  /** SHA-256 of the uploaded file, to refuse duplicates. */
  hash?: string;
  url: string;
  /** Poster frame for videos. */
  posterUrl?: string;
  alt: string;
  width: number;
  height: number;
  blurDataURL?: string;
  role?: "hero" | "bottle" | "box" | "texture" | "lifestyle";
}

export const APLUS_TYPES = { text: "Text", image: "Full-width image", image_text: "Image + text", features: "Feature list" } as const;
export type APlusType = keyof typeof APLUS_TYPES;

/** Rich "A+" content block below the product hero. */
export interface APlusBlock {
  id: string;
  type: APlusType;
  title?: string;
  body?: string;
  image?: { url: string; alt: string; width: number; height: number };
  /** For image_text: which side the image sits on. */
  imageSide?: "left" | "right";
  features?: string[];
}

/** Serializable product as the storefront sees it (no ObjectIds, no cost fields). */
export interface ProductDTO {
  id: string;
  slug: string;
  type: ProductType;
  name: string;
  tagline: string;
  /** Plain text: meta descriptions, JSON-LD, search. */
  description: string;
  /** Sanitised rich description for the product page, when the editor wrote one. */
  descriptionHtml?: string;
  categoryId?: string;
  tags: string[];
  badges: BadgeKey[];
  options: ProductOption[];
  specs: { label: string; value: string }[];
  aPlus: APlusBlock[];
  display: { notes: boolean; profile: boolean; specs: boolean; sharedAfterVariant: boolean };
  /** Index of the option whose values have their own photos (e.g. Edition); none = per variant. */
  imageAxis?: number;
  zodiacSign?: ZodiacSlug;
  element?: Element;
  concentration?: "extrait" | "edp" | "edt";
  notes?: { top: Note[]; heart: Note[]; base: Note[] };
  noteFamilies: string[];
  profile?: {
    intensity: 1 | 2 | 3 | 4 | 5;
    longevityHours: [number, number];
    sillage: 1 | 2 | 3 | 4 | 5;
    season: string[];
    timeOfDay: ("day" | "night")[];
  };
  howToWear?: string;
  compatibleSigns?: ZodiacSlug[];
  includes?: { name: string; detail: string }[];
  variants: Variant[];
  media: MediaItem[];
  legal: {
    manufacturer: string;
    packer?: string;
    countryOfOrigin: string;
    genericName: string;
  };
  hsnCode: string;
  gstRateBps: number;
  seo: { title?: string; description?: string; keywords?: string[] };
  ratingAvg: number;
  ratingCount: number;
  salesCount: number;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export type ProductCardDTO = Pick<
  ProductDTO,
  "id" | "slug" | "type" | "name" | "tagline" | "zodiacSign" | "element" | "noteFamilies" | "media" | "ratingAvg" | "ratingCount" | "categoryId" | "tags" | "badges" | "salesCount" | "createdAt" | "sortOrder" | "concentration"
> & {
  /** Bottle sizes of the active variants, for the size facet (plan.md §9.3). */
  sizesMl: number[];
  fromPriceP: Paise;
  fromMrpP: Paise;
  inStock: boolean;
  optionCount: number;
  /** First in-stock active variant (cheapest first): what quick add uses for single-variant products. */
  defaultSku?: string;
  /** Active variants for the card's size sheet (plan.md §10.5). */
  quickVariants: { sku: string; label: string; priceP: Paise; mrpP: Paise; inStock: boolean; maxPerOrder: number; stock: number; image?: { url: string; alt: string; blurDataURL?: string } }[];
};

export function toCard(p: ProductDTO): ProductCardDTO {
  const active = p.variants.filter((v) => v.isActive);
  const cheapest = active.reduce<Variant | undefined>((a, b) => (!a || b.priceP < a.priceP ? b : a), undefined);
  return {
    id: p.id,
    slug: p.slug,
    type: p.type,
    name: p.name,
    tagline: p.tagline,
    zodiacSign: p.zodiacSign,
    element: p.element,
    noteFamilies: p.noteFamilies,
    media: p.media.filter((m) => m.kind === "image").slice(0, 2),
    ratingAvg: p.ratingAvg,
    ratingCount: p.ratingCount,
    categoryId: p.categoryId,
    tags: p.tags,
    badges: p.badges,
    salesCount: p.salesCount,
    createdAt: p.createdAt,
    sortOrder: p.sortOrder,
    concentration: p.concentration,
    sizesMl: [...new Set(active.map((v) => v.volumeMl ?? 0).filter((ml) => ml > 0))],
    optionCount: active.length,
    fromPriceP: cheapest?.priceP ?? 0,
    fromMrpP: cheapest?.mrpP ?? 0,
    inStock: active.some((v) => v.stock > 0),
    defaultSku: active.toSorted((a, b) => a.priceP - b.priceP).find((v) => v.stock > 0)?.sku,
    quickVariants: active.map((v) => {
      // The variant's own cover, when it differs from the card's (card swatches, plan.md §10.1).
      const cover = coverFor(p, v.sku);
      const image = cover && cover.id !== p.media.find((m) => m.kind === "image")?.id ? { url: cover.url, alt: cover.alt, blurDataURL: cover.blurDataURL } : undefined;
      return { sku: v.sku, label: v.label, priceP: v.priceP, mrpP: v.mrpP, inStock: v.stock > 0, maxPerOrder: v.maxPerOrder, stock: Math.max(0, v.stock), image };
    }),
  };
}

export interface ImageRef {
  url: string;
  alt: string;
  width: number;
  height: number;
}

export interface CategoryDTO {
  id: string;
  slug: string;
  name: string;
  parentId?: string;
  description: string;
  image?: ImageRef;
  sortOrder: number;
  isActive: boolean;
  seo: { title?: string; description?: string };
}

export interface CollectionDTO {
  id: string;
  slug: string;
  name: string;
  description: string;
  kind: "manual" | "smart";
  productIds: string[];
  rules: RuleSet;
  image?: ImageRef;
  banner?: ImageRef;
  featured: boolean;
  sortOrder: number;
  isActive: boolean;
  seo: { title?: string; description?: string };
}
