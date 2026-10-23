import "server-only";
import { site } from "@/config/site";
import type { ZodiacSlug } from "@/config/zodiac";
import { textToHtml } from "@/server/catalog/rich-text";
import type { LeanProduct } from "@/server/queries/catalog";
import type { ProductInput, VariantInput } from "@/schemas/product";

/** Editor value: the save input plus read-only facts about existing variants. */
export type EditorVariant = VariantInput & { existing: boolean; stock: number; reserved: number };
export type EditorValue = Omit<ProductInput, "variants"> & { variants: EditorVariant[] };

export const BLANK_PRODUCT: EditorValue = {
  name: "",
  slug: "",
  type: "fragrance",
  status: "draft",
  categoryId: "",
  collectionIds: [],
  tags: [],
  badges: [],
  tagline: "",
  descriptionHtml: "",
  howToWear: "",
  notes: { top: [], heart: [], base: [] },
  options: [{ name: "Size", values: ["50 ml"] }],
  variants: [],
  media: [],
  specs: [],
  aPlus: [],
  display: { notes: true, profile: true, specs: true },
  manufacturer: `${site.legal.legalName}, ${site.legal.city}, ${site.legal.state}`,
  packer: "",
  countryOfOrigin: "India",
  genericName: "Extrait de Parfum",
  hsnCode: "33030050",
  seoTitle: "",
  seoDescription: "",
  seoKeywords: [],
  sortOrder: 50,
};

/** A stored product as editor/import input (rupees, plain values). */
export function productToInput(d: LeanProduct, collectionIds: string[]): EditorValue {
  return {
    id: String(d._id),
    name: d.name,
    slug: d.slug,
    type: d.type,
    status: d.status as EditorValue["status"],
    categoryId: d.categoryId ? String(d.categoryId) : "",
    collectionIds,
    tags: d.tags ?? [],
    badges: (d.badges ?? []) as EditorValue["badges"],
    zodiacSign: (d.zodiacSign ?? undefined) as ZodiacSlug | undefined,
    concentration: (d.concentration ?? undefined) as EditorValue["concentration"],
    tagline: d.tagline ?? "",
    descriptionHtml: d.descriptionHtml || textToHtml(d.description),
    howToWear: d.howToWear ?? "",
    intensity: (d.profile?.intensity ?? undefined) as number | undefined,
    notes: {
      top: (d.notes?.top ?? []).map((n) => ({ name: n.name, family: n.family })),
      heart: (d.notes?.heart ?? []).map((n) => ({ name: n.name, family: n.family })),
      base: (d.notes?.base ?? []).map((n) => ({ name: n.name, family: n.family })),
    },
    options: (d.options ?? []).map((o) => ({ name: o.name, values: [...o.values] })),
    variants: d.variants.map((v) => ({
      sku: v.sku,
      optionValues: v.optionValues ?? [],
      label: v.label,
      volumeMl: v.volumeMl ?? 0,
      mrp: v.mrpP / 100,
      price: v.priceP / 100,
      weightG: v.weightG,
      dimensionsCm: { l: v.dimensionsCm?.l ?? 0, b: v.dimensionsCm?.b ?? 0, h: v.dimensionsCm?.h ?? 0 },
      barcode: v.barcode ?? "",
      lowStockThreshold: v.lowStockThreshold ?? 5,
      maxPerOrder: v.maxPerOrder ?? 5,
      codAllowed: v.codAllowed ?? true,
      isActive: v.isActive ?? true,
      mediaIds: v.mediaIds ?? [],
      initialStock: 0,
      existing: true,
      stock: v.stock,
      reserved: v.reserved ?? 0,
    })),
    media: (d.media ?? []).map((m, i) => ({
      id: m.id ?? `m${i}`,
      kind: (m.kind ?? "image") as "image" | "video",
      url: m.url,
      ...(m.posterUrl ? { posterUrl: m.posterUrl } : {}),
      alt: m.alt,
      width: m.width,
      height: m.height,
    })),
    specs: (d.specs ?? []).map((s) => ({ label: s.label ?? "", value: s.value ?? "" })),
    aPlus: d.aPlus ? (JSON.parse(JSON.stringify(d.aPlus)) as EditorValue["aPlus"]) : [],
    display: { notes: d.display?.notes ?? true, profile: d.display?.profile ?? true, specs: d.display?.specs ?? true },
    manufacturer: d.legal?.manufacturer ?? "",
    packer: d.legal?.packer ?? "",
    countryOfOrigin: d.legal?.countryOfOrigin ?? "India",
    genericName: d.legal?.genericName ?? "",
    hsnCode: d.hsnCode,
    seoTitle: d.seo?.title ?? "",
    seoDescription: d.seo?.description ?? "",
    seoKeywords: d.seo?.keywords ?? [],
    sortOrder: d.sortOrder ?? 0,
  };
}

/** Strip the editor-only fields before validation. */
export function editorToInput(v: EditorValue): ProductInput {
  return { ...v, variants: v.variants.map(({ existing: _e, stock: _s, reserved: _r, ...row }) => row) };
}
