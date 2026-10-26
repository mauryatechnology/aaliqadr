import { z } from "zod";
import { ZODIAC_SLUGS } from "@/config/zodiac";
import { SKU_RE } from "@/lib/sku";
import { MAX_OPTIONS, variantKey } from "@/lib/variants";
import { APLUS_TYPES, BADGES, PRODUCT_TYPES } from "@/server/catalog/types";

/** Admin product editor input (docs/11 §3.3). Money arrives in rupees and is stored as paise. */

const rupees = z.number().nonnegative().max(1_000_000);
const objectId = z.string().regex(/^[a-f0-9]{24}$/);
const text = (max: number) => z.string().trim().max(max);
const httpsUrl = z.url({ protocol: /^https$/ }).or(z.string().regex(/^\/[\w./-]+$/));

/** An ISO date-time with offset, or "" for none. */
const isoTime = z.union([z.literal(""), z.iso.datetime({ offset: true })]).default("");

export const variantInput = z
  .object({
    sku: z.string().trim().toUpperCase().regex(SKU_RE, "SKU must look like AQ-ARI-50 (AQ-, a code, then one or two option codes)"),
    optionValues: z.array(text(40)).max(MAX_OPTIONS),
    label: z.string().trim().min(1).max(60),
    volumeMl: z.number().int().min(0).max(5000),
    mrp: rupees,
    price: rupees.refine((n) => n > 0, "Enter a price"),
    weightG: z.number().int().min(1).max(20000),
    dimensionsCm: z.object({ l: z.number().min(0).max(200), b: z.number().min(0).max(200), h: z.number().min(0).max(200) }),
    barcode: z.string().trim().regex(/^[A-Za-z0-9-]{0,32}$/, "Letters, digits and dashes only"),
    lowStockThreshold: z.number().int().min(0).max(1000),
    maxPerOrder: z.number().int().min(1).max(20),
    codAllowed: z.boolean(),
    isActive: z.boolean(),
    mediaIds: z.array(z.string().max(40)).max(20),
    /** Only used when the variant is new; existing stock changes go through Inventory. */
    initialStock: z.number().int().min(0).max(100000),
    /** Cost price in rupees (owner only; absent = keep what's stored). */
    cost: z.number().min(0).max(10_000_000).optional(),
  })
  .refine((v) => v.price <= v.mrp, { message: "Price can't be above MRP", path: ["price"] });

const note = z.object({ name: z.string().trim().min(1).max(40), family: z.string().trim().min(1).max(20) });

export const mediaScope = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("shared") }),
  z.object({ kind: z.literal("variant"), sku: z.string().max(40) }),
  z.object({ kind: z.literal("option"), axis: z.number().int().min(0).max(1), value: z.string().max(40) }),
]);

export const mediaInput = z.object({
  id: z.string().min(1).max(40),
  kind: z.enum(["image", "video"]),
  scope: mediaScope.default({ kind: "shared" }),
  hash: z.string().regex(/^[a-f0-9]{64}$/).optional(),
  blurDataURL: z.string().regex(/^data:image\/(webp|png|jpeg);base64,[A-Za-z0-9+/=]+$/).max(4000).optional(),
  url: httpsUrl,
  posterUrl: httpsUrl.optional(),
  alt: z.string().trim().min(3, "Describe every image (alt text)").max(140),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
});

const imageRef = z.object({ url: httpsUrl, alt: text(140), width: z.number().int().positive(), height: z.number().int().positive() });

export const aPlusInput = z.object({
  id: z.string().min(1).max(40),
  type: z.enum(Object.keys(APLUS_TYPES) as [keyof typeof APLUS_TYPES, ...(keyof typeof APLUS_TYPES)[]]),
  title: text(120).optional(),
  body: text(2000).optional(),
  image: imageRef.optional(),
  imageSide: z.enum(["left", "right"]).optional(),
  features: z.array(text(160)).max(12).optional(),
});

export const productInput = z
  .object({
    id: objectId.optional(),
    name: z.string().trim().min(2).max(80),
    slug: z.string().trim().toLowerCase().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Lowercase letters, numbers and dashes"),
    type: z.enum(PRODUCT_TYPES),
    status: z.enum(["draft", "active", "archived"]),
    categoryId: objectId,
    collectionIds: z.array(objectId).max(30),
    tags: z.array(z.string().trim().toLowerCase().min(1).max(30)).max(20),
    badges: z.array(z.enum(Object.keys(BADGES) as [keyof typeof BADGES, ...(keyof typeof BADGES)[]])).max(3),
    zodiacSign: z.enum(ZODIAC_SLUGS).optional(),
    concentration: z.enum(["extrait", "edp", "edt"]).optional(),
    tagline: text(160),
    descriptionHtml: z.string().max(20000),
    howToWear: text(1000),
    intensity: z.number().int().min(1).max(5).optional(),
    notes: z.object({ top: z.array(note).max(8), heart: z.array(note).max(8), base: z.array(note).max(8) }),
    options: z
      .array(z.object({ name: z.string().trim().min(1, "Name the option (e.g. Size)").max(30), values: z.array(z.string().trim().min(1).max(40)).min(1, "Add at least one value").max(12) }))
      .max(MAX_OPTIONS),
    variants: z.array(variantInput).min(1, "Add at least one variant").max(40),
    media: z.array(mediaInput).max(40, "Up to 40 photos and videos per product"),
    imageAxis: z.number().int().min(0).max(1).optional(),
    specs: z.array(z.object({ label: z.string().trim().min(1).max(40), value: z.string().trim().min(1).max(200) })).max(20),
    aPlus: z.array(aPlusInput).max(12),
    display: z.object({ notes: z.boolean(), profile: z.boolean(), specs: z.boolean(), sharedAfterVariant: z.boolean().default(true) }),
    manufacturer: z.string().trim().min(3).max(200),
    packer: text(200),
    countryOfOrigin: z.string().trim().min(2).max(60),
    genericName: z.string().trim().min(2).max(60),
    hsnCode: z.string().trim().regex(/^\d{4,8}$/, "Choose an HSN code"),
    seoTitle: text(70),
    seoDescription: text(170),
    seoKeywords: z.array(z.string().trim().min(1).max(40)).max(15),
    sortOrder: z.number().int().min(0).max(9999),
    /** ISO times (or "" for none): go live / be hidden automatically. */
    publishAt: isoTime,
    unpublishAt: isoTime,
  })
  .superRefine((p, ctx) => {
    if (p.publishAt && p.unpublishAt && p.unpublishAt <= p.publishAt) ctx.addIssue({ code: "custom", message: "The take-down time must be after the launch time", path: ["unpublishAt"] });
    if (p.type === "fragrance" && !p.zodiacSign) ctx.addIssue({ code: "custom", message: "A fragrance needs its zodiac sign", path: ["zodiacSign"] });
    if (new Set(p.variants.map((v) => v.sku)).size !== p.variants.length) ctx.addIssue({ code: "custom", message: "Each variant needs its own SKU", path: ["variants"] });
    if (new Set(p.options.map((o) => o.name.toLowerCase())).size !== p.options.length) ctx.addIssue({ code: "custom", message: "Option names must differ", path: ["options"] });
    p.options.forEach((o, i) => {
      if (new Set(o.values.map((v) => v.toLowerCase())).size !== o.values.length) ctx.addIssue({ code: "custom", message: `${o.name}: values must differ`, path: ["options", i] });
    });
    const keys = new Set<string>();
    p.variants.forEach((v, i) => {
      if (v.optionValues.length !== p.options.length) {
        ctx.addIssue({ code: "custom", message: `${v.sku}: choose a value for every option`, path: ["variants", i] });
        return;
      }
      v.optionValues.forEach((val, j) => {
        if (!p.options[j]!.values.includes(val)) ctx.addIssue({ code: "custom", message: `${v.sku}: "${val}" isn't a ${p.options[j]!.name} value`, path: ["variants", i] });
      });
      const k = variantKey(v.optionValues);
      if (keys.has(k)) ctx.addIssue({ code: "custom", message: `Two variants share ${v.optionValues.join(" / ") || "the same options"}`, path: ["variants", i] });
      keys.add(k);
    });
    const mediaIds = new Set(p.media.map((m) => m.id));
    if (p.variants.some((v) => v.mediaIds.some((id) => !mediaIds.has(id)))) ctx.addIssue({ code: "custom", message: "A variant points at a removed image", path: ["variants"] });
    if (p.media.length && p.media[0]!.kind !== "image") ctx.addIssue({ code: "custom", message: "The first (cover) item must be an image", path: ["media"] });
    if (p.imageAxis !== undefined && !p.options[p.imageAxis]) ctx.addIssue({ code: "custom", message: "Photos are set to follow an option that no longer exists", path: ["imageAxis"] });
    const skus = new Set(p.variants.map((v) => v.sku));
    const perVariant = new Map<string, number>();
    p.media.forEach((m, i) => {
      if (m.scope.kind === "variant") {
        if (!skus.has(m.scope.sku)) ctx.addIssue({ code: "custom", message: `A photo belongs to ${m.scope.sku}, which isn't a variant any more`, path: ["media", i] });
        perVariant.set(m.scope.sku, (perVariant.get(m.scope.sku) ?? 0) + 1);
      }
      if (m.scope.kind === "option") {
        const scope = m.scope;
        if (scope.axis !== p.imageAxis || !p.options[scope.axis]?.values.includes(scope.value)) ctx.addIssue({ code: "custom", message: `Photos for "${scope.value}" no longer match an option value`, path: ["media", i] });
      }
    });
    for (const [sku, n] of perVariant) if (n > 12) ctx.addIssue({ code: "custom", message: `${sku} has ${n} photos; up to 12 per variant`, path: ["media"] });
  });

export type ProductInput = z.infer<typeof productInput>;
export type VariantInput = z.infer<typeof variantInput>;
export type APlusInput = z.infer<typeof aPlusInput>;
export type MediaInput = z.infer<typeof mediaInput>;

// ── Categories, collections, HSN ─────────────────────────────────────────────

const slug = z.string().trim().toLowerCase().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Lowercase letters, numbers and dashes");

export const categoryInput = z.object({
  id: objectId.optional(),
  name: z.string().trim().min(2).max(60),
  slug,
  parentId: objectId.optional(),
  description: text(600),
  image: imageRef.optional(),
  sortOrder: z.number().int().min(0).max(9999),
  isActive: z.boolean(),
  seoTitle: text(70),
  seoDescription: text(170),
});
export type CategoryInput = z.infer<typeof categoryInput>;

export const ruleInput = z.object({
  field: z.enum(["tag", "badge", "category", "sign", "element", "type", "price", "stock", "title"]),
  op: z.enum(["equals", "not_equals", "contains", "greater_than", "less_than"]),
  value: z.string().trim().min(1, "Enter a value").max(60),
});

export const collectionInput = z
  .object({
    id: objectId.optional(),
    name: z.string().trim().min(2).max(60),
    slug,
    description: text(600),
    kind: z.enum(["manual", "smart"]),
    productIds: z.array(objectId).max(200),
    rules: z.object({ match: z.enum(["all", "any"]), conditions: z.array(ruleInput).max(10) }),
    image: imageRef.optional(),
    banner: imageRef.optional(),
    featured: z.boolean(),
    sortOrder: z.number().int().min(0).max(9999),
    isActive: z.boolean(),
    seoTitle: text(70),
    seoDescription: text(170),
  })
  .refine((c) => c.kind !== "smart" || c.rules.conditions.length > 0, { message: "Add at least one rule", path: ["rules"] });
export type CollectionInput = z.infer<typeof collectionInput>;

export const hsnInput = z.object({
  id: objectId.optional(),
  code: z.string().trim().regex(/^\d{4,8}$/, "4–8 digits"),
  description: z.string().trim().min(3).max(200),
  gstRatePercent: z.number().refine((n) => [0, 0.25, 3, 5, 12, 18, 28].includes(n), "Use a GST slab: 0, 0.25, 3, 5, 12, 18 or 28"),
  isActive: z.boolean(),
});
export type HsnInput = z.infer<typeof hsnInput>;
