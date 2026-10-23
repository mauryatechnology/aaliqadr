import type { Element, Note, ZodiacSlug } from "@/config/zodiac";
import type { Paise } from "@/lib/money";

export const PRODUCT_TYPES = ["fragrance", "bundle", "gift_set", "body_care", "accessory"] as const;
export type ProductType = (typeof PRODUCT_TYPES)[number];

export interface Variant {
  sku: string;
  label: string;
  volumeMl: number;
  mrpP: Paise;
  priceP: Paise;
  stock: number;
  lowStockThreshold: number;
  weightG: number;
  isActive: boolean;
  codAllowed: boolean;
  maxPerOrder: number;
}

export interface MediaItem {
  url: string;
  alt: string;
  width: number;
  height: number;
  blurDataURL?: string;
  role?: "hero" | "bottle" | "box" | "texture" | "lifestyle";
}

/** Serializable product as the storefront sees it (no ObjectIds, no cost fields). */
export interface ProductDTO {
  id: string;
  slug: string;
  type: ProductType;
  name: string;
  tagline: string;
  description: string;
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
    countryOfOrigin: string;
    genericName: string;
  };
  hsnCode: string;
  gstRateBps: number;
  seo: { title?: string; description?: string };
  ratingAvg: number;
  ratingCount: number;
  salesCount: number;
  sortOrder: number;
  updatedAt: string;
}

export type ProductCardDTO = Pick<
  ProductDTO,
  "id" | "slug" | "type" | "name" | "tagline" | "zodiacSign" | "element" | "noteFamilies" | "media" | "ratingAvg" | "ratingCount"
> & { fromPriceP: Paise; fromMrpP: Paise; inStock: boolean };

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
    media: p.media.slice(0, 2),
    ratingAvg: p.ratingAvg,
    ratingCount: p.ratingCount,
    fromPriceP: cheapest?.priceP ?? 0,
    fromMrpP: cheapest?.mrpP ?? 0,
    inStock: active.some((v) => v.stock > 0),
  };
}
