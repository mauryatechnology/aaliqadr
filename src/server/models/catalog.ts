import "server-only";
import mongoose, { Schema, type Model, type Types } from "mongoose";

/** Catalogue structure (docs/04 §4.3): categories, collections and the HSN master. */

function model<T>(name: string, schema: Schema<T>): Model<T> {
  return (mongoose.models[name] as Model<T> | undefined) ?? mongoose.model<T>(name, schema);
}

export interface ImageRefDoc {
  url: string;
  alt: string;
  width: number;
  height: number;
}
const ImageRef = new Schema<ImageRefDoc>({ url: String, alt: String, width: Number, height: Number }, { _id: false });
const Seo = { title: String, description: String };

// ── Categories: a tree (parentId), one per product ─────────────────────────────
export interface CategoryDoc {
  _id: Types.ObjectId;
  slug: string;
  name: string;
  parentId?: Types.ObjectId | null;
  description?: string;
  image?: ImageRefDoc;
  sortOrder: number;
  isActive: boolean;
  seo?: { title?: string; description?: string };
  createdAt?: Date;
  updatedAt?: Date;
}
const CategorySchema = new Schema<CategoryDoc>(
  {
    slug: { type: String, required: true, lowercase: true, trim: true },
    name: { type: String, required: true, trim: true },
    parentId: { type: Schema.Types.ObjectId, ref: "Category", default: null },
    description: { type: String, default: "" },
    image: ImageRef,
    sortOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    seo: Seo,
  },
  { timestamps: true },
);
CategorySchema.index({ slug: 1 }, { unique: true });
CategorySchema.index({ parentId: 1, sortOrder: 1 });
export const Category = model<CategoryDoc>("Category", CategorySchema);

// ── Collections: hand-picked (manual) or rule-based (smart) ────────────────────
export interface CollectionDoc {
  _id: Types.ObjectId;
  slug: string;
  name: string;
  description?: string;
  kind: "manual" | "smart";
  productIds: Types.ObjectId[];
  rules: { match: "all" | "any"; conditions: { field: string; op: string; value: string }[] };
  image?: ImageRefDoc;
  banner?: ImageRefDoc;
  featured: boolean;
  sortOrder: number;
  isActive: boolean;
  seo?: { title?: string; description?: string };
  createdAt?: Date;
  updatedAt?: Date;
}
const CollectionSchema = new Schema<CollectionDoc>(
  {
    slug: { type: String, required: true, lowercase: true, trim: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    kind: { type: String, enum: ["manual", "smart"], default: "manual" },
    productIds: { type: [Schema.Types.ObjectId], default: [] },
    rules: {
      match: { type: String, enum: ["all", "any"], default: "all" },
      conditions: { type: [{ _id: false, field: String, op: String, value: String }], default: [] },
    },
    image: ImageRef,
    banner: ImageRef,
    featured: { type: Boolean, default: false },
    sortOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    seo: Seo,
  },
  { timestamps: true },
);
CollectionSchema.index({ slug: 1 }, { unique: true });
CollectionSchema.index({ isActive: 1, featured: 1, sortOrder: 1 });
export const Collection = model<CollectionDoc>("Collection", CollectionSchema);

// ── HSN master: the codes and GST rates products may use ──────────────────────
export interface HsnCodeDoc {
  _id: Types.ObjectId;
  code: string;
  description: string;
  gstRateBps: number;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}
const HsnCodeSchema = new Schema<HsnCodeDoc>(
  {
    code: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    gstRateBps: { type: Number, required: true, min: 0, max: 2800 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);
HsnCodeSchema.index({ code: 1 }, { unique: true });
export const HsnCode = model<HsnCodeDoc>("HsnCode", HsnCodeSchema);

// ── Product revisions: every saved version, for history and restore (append-only) ─
export interface ProductRevisionDoc {
  _id: Types.ObjectId;
  productId: Types.ObjectId;
  /** The editor input that was saved (no stock or costs). */
  value: unknown;
  status: string;
  savedBy: { userId: string; name: string; role: string };
  createdAt: Date;
}
const ProductRevisionSchema = new Schema<ProductRevisionDoc>(
  {
    productId: { type: Schema.Types.ObjectId, required: true },
    value: { type: Schema.Types.Mixed, required: true },
    status: String,
    savedBy: { userId: String, name: String, role: String },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);
ProductRevisionSchema.index({ productId: 1, createdAt: -1 });
export const ProductRevision = model<ProductRevisionDoc>("ProductRevision", ProductRevisionSchema);

// ── Product drafts: unpublished edits to a live product (one per product) ─────
export interface ProductDraftDoc {
  _id: Types.ObjectId;
  value: unknown;
  savedBy: { userId: string; name: string; role: string };
  updatedAt: Date;
}
const ProductDraftSchema = new Schema<ProductDraftDoc>(
  {
    _id: { type: Schema.Types.ObjectId, required: true },
    value: { type: Schema.Types.Mixed, required: true },
    savedBy: { userId: String, name: String, role: String },
  },
  { timestamps: { createdAt: false, updatedAt: true } },
);
export const ProductDraft = model<ProductDraftDoc>("ProductDraft", ProductDraftSchema);
