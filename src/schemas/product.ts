import { z } from "zod";
import { ZODIAC_SLUGS } from "@/config/zodiac";
import { PRODUCT_TYPES } from "@/server/catalog/types";

/** Admin product editor input (docs/11 §3.3). Money arrives in rupees and is stored as paise. */

const rupees = z.number().nonnegative().max(1_000_000);

export const variantInput = z
  .object({
    sku: z.string().trim().toUpperCase().regex(/^AQ-[A-Z]{3}-[A-Z0-9]{1,3}$/, "SKU must look like AQ-ARI-50"),
    label: z.string().trim().min(1).max(30),
    volumeMl: z.number().int().min(1).max(1000),
    mrp: rupees,
    price: rupees,
    weightG: z.number().int().min(1).max(10000),
    lowStockThreshold: z.number().int().min(0).max(1000),
    maxPerOrder: z.number().int().min(1).max(20),
    codAllowed: z.boolean(),
    isActive: z.boolean(),
    /** Only used when the variant is new; existing stock changes go through Inventory. */
    initialStock: z.number().int().min(0).max(100000),
  })
  .refine((v) => v.price <= v.mrp, { message: "Price can't be above MRP", path: ["price"] });

const note = z.object({ name: z.string().trim().min(1).max(40), family: z.string().trim().min(1).max(20) });

export const productInput = z
  .object({
    id: z.string().regex(/^[a-f0-9]{24}$/).optional(),
    name: z.string().trim().min(2).max(80),
    slug: z.string().trim().toLowerCase().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Lowercase letters, numbers and dashes"),
    type: z.enum(PRODUCT_TYPES),
    status: z.enum(["draft", "active", "archived"]),
    zodiacSign: z.enum(ZODIAC_SLUGS).optional(),
    concentration: z.enum(["extrait", "edp", "edt"]).optional(),
    tagline: z.string().trim().max(160),
    description: z.string().trim().min(20, "Write at least a couple of sentences").max(4000),
    howToWear: z.string().trim().max(1000),
    intensity: z.number().int().min(1).max(5).optional(),
    notes: z.object({ top: z.array(note).max(8), heart: z.array(note).max(8), base: z.array(note).max(8) }),
    manufacturer: z.string().trim().min(3).max(200),
    countryOfOrigin: z.string().trim().min(2).max(60),
    genericName: z.string().trim().min(2).max(60),
    hsnCode: z.string().trim().regex(/^\d{4,8}$/, "4–8 digit HSN"),
    gstRatePercent: z.number().min(0).max(28),
    seoTitle: z.string().trim().max(70),
    seoDescription: z.string().trim().max(170),
    sortOrder: z.number().int().min(0).max(999),
    media: z.array(z.object({ url: z.url(), alt: z.string().trim().min(3).max(140), width: z.number().int().positive(), height: z.number().int().positive() })).max(12),
    variants: z.array(variantInput).min(1, "Add at least one size").max(10),
  })
  .refine((p) => p.type !== "fragrance" || !!p.zodiacSign, { message: "A fragrance needs its zodiac sign", path: ["zodiacSign"] })
  .refine((p) => new Set(p.variants.map((v) => v.sku)).size === p.variants.length, { message: "Each size needs its own SKU", path: ["variants"] });

export type ProductInput = z.infer<typeof productInput>;
