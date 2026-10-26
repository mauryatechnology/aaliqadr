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
  /** "Was this helpful?" votes (plan.md §10.3). */
  helpful?: number;
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
    helpful: { type: Number, default: 0 },
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
  /** `startsAt` / `endsAt` (ISO) schedule a message or banner (plan.md §5). */
  announcement: { text: string; href?: string; active: boolean; startsAt?: string; endsAt?: string };
  banners: { id: string; title: string; subtitle?: string; cta?: string; href?: string; image?: { url: string; alt: string; width: number; height: number }; active: boolean; startsAt?: string; endsAt?: string }[];
  faqs: { id: string; question: string; answer: string; group: string }[];
  /** Storefront search: suggestions before typing, and extra synonym groups (plan.md §9.2). */
  search?: { popular: string[]; synonyms: string[][] };
  policies: Partial<Record<PolicyKey, PolicyContent>>;
  updatedAt?: Date;
}
const ImageRef = { url: String, alt: String, width: Number, height: Number };
const PolicySchema = new Schema<PolicyContent>({ title: String, summary: String, sections: [{ _id: false, heading: String, body: String }], version: Number, updatedAt: Date }, { _id: false });
const ContentSchema = new Schema<ContentDoc>(
  {
    _id: { type: String, default: "storefront" },
    announcement: { text: { type: String, default: "" }, href: String, active: { type: Boolean, default: false }, startsAt: String, endsAt: String },
    banners: { type: [{ _id: false, id: String, title: String, subtitle: String, cta: String, href: String, image: ImageRef, active: Boolean, startsAt: String, endsAt: String }], default: [] },
    faqs: { type: [{ _id: false, id: String, question: String, answer: String, group: String }], default: [] },
    search: { popular: { type: [String], default: [] }, synonyms: { type: [[String]], default: [] } },
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

// ── Search analytics: what shoppers look for (no personal data) (plan.md §9.2) ──
export interface SearchLogDoc {
  q: string;
  event: "search" | "click" | "add";
  results?: number;
  slug?: string;
  createdAt?: Date;
}
const SearchLogSchema = new Schema<SearchLogDoc>(
  {
    q: { type: String, required: true, lowercase: true, trim: true, maxlength: 60 },
    event: { type: String, enum: ["search", "click", "add"], required: true },
    results: Number,
    slug: String,
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);
SearchLogSchema.index({ createdAt: -1, event: 1 });
SearchLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 400 * 86_400 });
export const SearchLog = model<SearchLogDoc>("SearchLog", SearchLogSchema);

// ── Wishlist (plan.md §11.3): one row per saved product per customer ─────────
export interface WishlistItemDoc {
  userId: string;
  productId: Types.ObjectId;
  slug: string;
  /** Lowest price when saved, so a price-drop alert knows what "drop" means. */
  priceAtAddP: number;
  alerts: { price: boolean; stock: boolean };
  createdAt?: Date;
}
const WishlistItemSchema = new Schema<WishlistItemDoc>(
  {
    userId: { type: String, required: true },
    productId: { type: Schema.Types.ObjectId, required: true },
    slug: { type: String, required: true },
    priceAtAddP: { type: Number, default: 0 },
    alerts: { price: { type: Boolean, default: false }, stock: { type: Boolean, default: false } },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);
WishlistItemSchema.index({ userId: 1, productId: 1 }, { unique: true });
WishlistItemSchema.index({ productId: 1 });
export const WishlistItem = model<WishlistItemDoc>("WishlistItem", WishlistItemSchema);

// ── Stock alerts: "Notify me" on a sold-out size (plan.md §10.3) ─────────────
export interface StockAlertDoc {
  email: string;
  sku: string;
  productId: Types.ObjectId;
  slug: string;
  userId?: string;
  notifiedAt?: Date;
  createdAt?: Date;
}
const StockAlertSchema = new Schema<StockAlertDoc>(
  {
    email: { type: String, required: true, lowercase: true, trim: true },
    sku: { type: String, required: true },
    productId: { type: Schema.Types.ObjectId, required: true },
    slug: { type: String, required: true },
    userId: String,
    notifiedAt: Date,
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);
StockAlertSchema.index({ sku: 1, email: 1 }, { unique: true });
StockAlertSchema.index({ sku: 1, notifiedAt: 1 });
// Alerts that fired are kept 90 days, then removed.
StockAlertSchema.index({ notifiedAt: 1 }, { expireAfterSeconds: 90 * 86_400 });
export const StockAlert = model<StockAlertDoc>("StockAlert", StockAlertSchema);

// ── Helpful votes: one per review per voter (signed-in id or a hashed device key) ──
export interface ReviewVoteDoc {
  reviewId: Types.ObjectId;
  voter: string;
  createdAt?: Date;
}
const ReviewVoteSchema = new Schema<ReviewVoteDoc>({ reviewId: { type: Schema.Types.ObjectId, required: true }, voter: { type: String, required: true } }, { timestamps: { createdAt: true, updatedAt: false } });
ReviewVoteSchema.index({ reviewId: 1, voter: 1 }, { unique: true });
export const ReviewVote = model<ReviewVoteDoc>("ReviewVote", ReviewVoteSchema);

// ── Product questions (plan.md §10.3): asked publicly, shown once answered ───
export const QUESTION_STATUSES = ["pending", "answered", "hidden"] as const;
export type QuestionStatus = (typeof QUESTION_STATUSES)[number];
export interface QuestionDoc {
  _id: Types.ObjectId;
  productId: Types.ObjectId;
  productSlug: string;
  productName: string;
  question: string;
  name: string;
  email: string;
  userId?: string;
  status: QuestionStatus;
  answer?: { body: string; by: string; at: Date };
  createdAt: Date;
}
const QuestionSchema = new Schema<QuestionDoc>(
  {
    productId: { type: Schema.Types.ObjectId, required: true },
    productSlug: { type: String, required: true },
    productName: { type: String, required: true },
    question: { type: String, required: true, maxlength: 500 },
    name: { type: String, required: true },
    email: { type: String, required: true, lowercase: true, select: false },
    userId: String,
    status: { type: String, enum: QUESTION_STATUSES, default: "pending" },
    answer: { body: String, by: String, at: Date },
  },
  { timestamps: true },
);
QuestionSchema.index({ productId: 1, status: 1, createdAt: -1 });
QuestionSchema.index({ status: 1, createdAt: -1 });
export const Question = model<QuestionDoc>("Question", QuestionSchema);
