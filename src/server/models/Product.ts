import "server-only";
import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";
import { ELEMENTS, ZODIAC_SLUGS } from "@/config/zodiac";
import { PRODUCT_TYPES } from "@/server/catalog/types";

const NoteSchema = new Schema({ name: { type: String, required: true }, family: { type: String, required: true } }, { _id: false });

const VariantSchema = new Schema(
  {
    sku: { type: String, required: true },
    label: { type: String, required: true },
    volumeMl: { type: Number, required: true, min: 0 },
    mrpP: { type: Number, required: true, min: 0 },
    priceP: { type: Number, required: true, min: 0 },
    costP: { type: Number, select: false },
    stock: { type: Number, required: true, min: 0, default: 0 },
    reserved: { type: Number, required: true, min: 0, default: 0 },
    lowStockThreshold: { type: Number, default: 5 },
    weightG: { type: Number, required: true, min: 1 },
    dimensionsCm: { l: Number, b: Number, h: Number },
    barcode: String,
    isActive: { type: Boolean, default: true },
    codAllowed: { type: Boolean, default: true },
    maxPerOrder: { type: Number, default: 5, min: 1 },
  },
  { _id: false },
);

const MediaSchema = new Schema(
  {
    url: { type: String, required: true },
    pathname: String,
    alt: { type: String, required: true },
    width: { type: Number, required: true },
    height: { type: Number, required: true },
    blurDataURL: String,
    kind: { type: String, enum: ["image", "video"], default: "image" },
    role: { type: String, enum: ["hero", "bottle", "box", "texture", "lifestyle"] },
  },
  { _id: false },
);

const ProductSchema = new Schema(
  {
    slug: { type: String, required: true, lowercase: true, trim: true },
    type: { type: String, enum: PRODUCT_TYPES, required: true },
    status: { type: String, enum: ["draft", "active", "archived"], default: "draft" },
    name: { type: String, required: true, trim: true },
    tagline: { type: String, default: "" },
    description: { type: String, required: true },
    story: String,
    zodiacSign: { type: String, enum: ZODIAC_SLUGS },
    element: { type: String, enum: ELEMENTS },
    concentration: { type: String, enum: ["extrait", "edp", "edt"] },
    notes: { top: [NoteSchema], heart: [NoteSchema], base: [NoteSchema] },
    noteFamilies: { type: [String], default: [] },
    profile: {
      intensity: { type: Number, min: 1, max: 5 },
      longevityHours: [Number],
      sillage: { type: Number, min: 1, max: 5 },
      season: [String],
      timeOfDay: [String],
    },
    howToWear: String,
    ingredients: String,
    allergens: [String],
    compatibleSigns: [{ type: String, enum: ZODIAC_SLUGS }],
    includes: [{ _id: false, name: String, detail: String }],
    variants: { type: [VariantSchema], validate: [(v: unknown[]) => v.length > 0, "At least one variant"] },
    media: { type: [MediaSchema], default: [] },
    legal: {
      manufacturer: { type: String, required: true },
      packer: String,
      importer: String,
      countryOfOrigin: { type: String, required: true },
      genericName: { type: String, required: true },
    },
    hsnCode: { type: String, required: true },
    gstRateBps: { type: Number, required: true },
    seo: { title: String, description: String, ogImage: String, keywords: [String] },
    ratingAvg: { type: Number, default: 0 },
    ratingCount: { type: Number, default: 0 },
    salesCount: { type: Number, default: 0 },
    sortOrder: { type: Number, default: 0 },
    publishedAt: Date,
  },
  { timestamps: true },
);

ProductSchema.index({ slug: 1 }, { unique: true });
ProductSchema.index({ "variants.sku": 1 }, { unique: true });
ProductSchema.index({ status: 1, type: 1, sortOrder: 1 });
ProductSchema.index({ status: 1, zodiacSign: 1 });
ProductSchema.index({ status: 1, element: 1 });
ProductSchema.index({ status: 1, salesCount: -1 });

export type ProductDoc = InferSchemaType<typeof ProductSchema>;

export const Product: Model<ProductDoc> =
  (mongoose.models.Product as Model<ProductDoc>) ?? mongoose.model<ProductDoc>("Product", ProductSchema);
