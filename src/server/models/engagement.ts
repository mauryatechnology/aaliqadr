import "server-only";
import mongoose, { Schema, type Model, type Types } from "mongoose";

/** Reviews, returns & claims, storefront content and staff invites (docs/04 §4.12–4.15). */

function model<T>(name: string, schema: Schema<T>): Model<T> {
  return (mongoose.models[name] as Model<T> | undefined) ?? mongoose.model<T>(name, schema);
}

type Actor = { name: string; role: string; userId?: string };
const ActorSchema = { name: { type: String, required: true }, role: { type: String, required: true }, userId: String };

// ── Reviews: one per customer per product, moderated before they show ────────
export const REVIEW_STATUSES = ["pending", "approved", "rejected"] as const;
export type ReviewStatus = (typeof REVIEW_STATUSES)[number];

export interface ReviewDoc {
  _id: Types.ObjectId;
  productId: Types.ObjectId;
  productSlug: string;
  productName: string;
  userId: string;
  name: string;
  email: string;
  rating: number;
  title: string;
  body: string;
  photos: { url: string; width: number; height: number }[];
  verified: boolean;
  status: ReviewStatus;
  reply?: { body: string; at: Date; by: string };
  moderatedBy?: Actor;
  createdAt: Date;
  updatedAt: Date;
}
const ReviewSchema = new Schema<ReviewDoc>(
  {
    productId: { type: Schema.Types.ObjectId, required: true },
    productSlug: { type: String, required: true },
    productName: { type: String, required: true },
    userId: { type: String, required: true },
    name: { type: String, required: true },
    email: { type: String, required: true, select: false },
    rating: { type: Number, required: true, min: 1, max: 5 },
    title: { type: String, default: "" },
    body: { type: String, required: true },
    photos: { type: [{ _id: false, url: String, width: Number, height: Number }], default: [] },
    verified: { type: Boolean, default: false },
    status: { type: String, enum: REVIEW_STATUSES, default: "pending" },
    reply: { body: String, at: Date, by: String },
    moderatedBy: ActorSchema,
  },
  { timestamps: true },
);
ReviewSchema.index({ productId: 1, userId: 1 }, { unique: true });
ReviewSchema.index({ productId: 1, status: 1, createdAt: -1 });
ReviewSchema.index({ status: 1, createdAt: -1 });
export const Review = model<ReviewDoc>("Review", ReviewSchema);

// ── Returns & claims (damaged, leaked, wrong, missing) ───────────────────────
export const RETURN_REASONS = { damaged: "Arrived damaged", leaked: "Leaked in transit", wrong_item: "Wrong item sent", missing_item: "Item missing from the parcel", other: "Something else" } as const;
export type ReturnReason = keyof typeof RETURN_REASONS;
export const RETURN_STATUSES = ["requested", "approved", "rejected", "received", "refunded", "replaced", "closed"] as const;
export type ReturnStatus = (typeof RETURN_STATUSES)[number];

export interface ReturnDoc {
  _id: string;
  orderId: string;
  userId?: string;
  email: string;
  name: string;
  items: { sku: string; name: string; variantLabel: string; qty: number; unitPriceP: number }[];
  reason: ReturnReason;
  description: string;
  evidence: { url: string; kind: "image" | "video" }[];
  status: ReturnStatus;
  resolution?: "refund" | "replacement";
  refundP: number;
  refundId?: string;
  replacement?: { courier?: string; awb?: string; sentAt?: Date };
  history: { at: Date; status: string; note?: string; actor: Actor; visibleToCustomer: boolean }[];
  createdAt: Date;
  updatedAt: Date;
}
const ReturnSchema = new Schema<ReturnDoc>(
  {
    _id: { type: String, required: true },
    orderId: { type: String, required: true },
    userId: String,
    email: { type: String, required: true },
    name: { type: String, required: true },
    items: { type: [{ _id: false, sku: String, name: String, variantLabel: String, qty: Number, unitPriceP: Number }], required: true },
    reason: { type: String, enum: Object.keys(RETURN_REASONS), required: true },
    description: { type: String, required: true },
    evidence: { type: [{ _id: false, url: String, kind: { type: String, enum: ["image", "video"] } }], default: [] },
    status: { type: String, enum: RETURN_STATUSES, default: "requested" },
    resolution: { type: String, enum: ["refund", "replacement"] },
    refundP: { type: Number, default: 0 },
    refundId: String,
    replacement: { courier: String, awb: String, sentAt: Date },
    history: { type: [{ _id: false, at: Date, status: String, note: String, actor: ActorSchema, visibleToCustomer: Boolean }], default: [] },
  },
  { timestamps: true },
);
ReturnSchema.index({ orderId: 1 });
ReturnSchema.index({ status: 1, createdAt: -1 });
ReturnSchema.index({ email: 1, createdAt: -1 });
export const ReturnRequest = model<ReturnDoc>("ReturnRequest", ReturnSchema);

// ── Storefront content: announcement bar, home banners, FAQs, policies ───────
export const POLICY_KEYS = ["shipping", "returns", "privacy", "terms", "grievance"] as const;
export type PolicyKey = (typeof POLICY_KEYS)[number];

export interface PolicyContent {
  title: string;
  summary: string;
  sections: { heading: string; body: string }[];
  version: number;
  updatedAt: Date;
}

export interface ContentDoc {
  _id: "storefront";
  announcement: { text: string; href?: string; active: boolean };
  banners: { id: string; title: string; subtitle?: string; cta?: string; href?: string; image?: { url: string; alt: string; width: number; height: number }; active: boolean }[];
  faqs: { id: string; question: string; answer: string; group: string }[];
  policies: Partial<Record<PolicyKey, PolicyContent>>;
  updatedAt?: Date;
}
const ImageRef = { url: String, alt: String, width: Number, height: Number };
const PolicySchema = new Schema<PolicyContent>({ title: String, summary: String, sections: [{ _id: false, heading: String, body: String }], version: Number, updatedAt: Date }, { _id: false });
const ContentSchema = new Schema<ContentDoc>(
  {
    _id: { type: String, default: "storefront" },
    announcement: { text: { type: String, default: "" }, href: String, active: { type: Boolean, default: false } },
    banners: { type: [{ _id: false, id: String, title: String, subtitle: String, cta: String, href: String, image: ImageRef, active: Boolean }], default: [] },
    faqs: { type: [{ _id: false, id: String, question: String, answer: String, group: String }], default: [] },
    policies: { shipping: PolicySchema, returns: PolicySchema, privacy: PolicySchema, terms: PolicySchema, grievance: PolicySchema },
  },
  { timestamps: true },
);
export const Content = model<ContentDoc>("Content", ContentSchema);

/** Append-only history of every published policy version (consumer-law record keeping). */
export interface PolicyVersionDoc {
  key: PolicyKey;
  version: number;
  title: string;
  summary: string;
  sections: { heading: string; body: string }[];
  publishedBy: Actor;
  createdAt?: Date;
}
const PolicyVersionSchema = new Schema<PolicyVersionDoc>(
  {
    key: { type: String, enum: POLICY_KEYS, required: true },
    version: { type: Number, required: true },
    title: String,
    summary: String,
    sections: [{ _id: false, heading: String, body: String }],
    publishedBy: ActorSchema,
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);
PolicyVersionSchema.index({ key: 1, version: -1 }, { unique: true });
export const PolicyVersion = model<PolicyVersionDoc>("PolicyVersion", PolicyVersionSchema);

// ── Staff invites: an email gets its role the first time it signs in ────────
export interface StaffInviteDoc {
  _id: Types.ObjectId;
  email: string;
  role: "staff" | "admin";
  invitedBy: Actor;
  acceptedAt?: Date;
  createdAt?: Date;
}
const StaffInviteSchema = new Schema<StaffInviteDoc>(
  {
    email: { type: String, required: true, lowercase: true, trim: true },
    role: { type: String, enum: ["staff", "admin"], required: true },
    invitedBy: ActorSchema,
    acceptedAt: Date,
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);
StaffInviteSchema.index({ email: 1 }, { unique: true });
export const StaffInvite = model<StaffInviteDoc>("StaffInvite", StaffInviteSchema);
