import "server-only";
import mongoose, { Schema, type Model } from "mongoose";

/**
 * Supporting commerce collections (docs/04 §4). Types are explicit interfaces rather than
 * InferSchemaType: inferring eight schemas at once exhausted the type checker's memory.
 */

type Actor = { name: string; role: string; userId?: string };

function model<T>(name: string, schema: Schema<T>): Model<T> {
  return (mongoose.models[name] as Model<T> | undefined) ?? mongoose.model<T>(name, schema);
}

// ── Counters: atomic sequences for human-readable ids ──────────────────────────
export interface CounterDoc {
  _id: string;
  seq: number;
}
export const Counter = model<CounterDoc>("Counter", new Schema<CounterDoc>({ _id: { type: String, required: true }, seq: { type: Number, default: 0 } }));

// ── Payments: every gateway payment and refund ────────────────────────────────
export interface PaymentDoc {
  orderId: string;
  kind: "payment" | "refund";
  gatewayOrderId?: string;
  gatewayPaymentId?: string;
  gatewayRefundId?: string;
  amountP: number;
  status: string;
  method?: string;
  source: "callback" | "webhook" | "reconcile" | "admin";
  raw?: unknown;
  createdAt?: Date;
}
const PaymentSchema = new Schema<PaymentDoc>(
  {
    orderId: { type: String, required: true, index: true },
    kind: { type: String, enum: ["payment", "refund"], required: true },
    gatewayOrderId: String,
    gatewayPaymentId: String,
    gatewayRefundId: String,
    amountP: { type: Number, required: true },
    status: { type: String, required: true },
    method: String,
    source: { type: String, enum: ["callback", "webhook", "reconcile", "admin"], required: true },
    raw: { type: Schema.Types.Mixed, select: false },
  },
  { timestamps: true },
);
PaymentSchema.index({ gatewayPaymentId: 1, kind: 1 }, { unique: true, partialFilterExpression: { kind: "payment", gatewayPaymentId: { $type: "string" } } });
PaymentSchema.index({ gatewayRefundId: 1 }, { unique: true, partialFilterExpression: { gatewayRefundId: { $type: "string" } } });
export const Payment = model<PaymentDoc>("Payment", PaymentSchema);

// ── Webhook dedupe log ────────────────────────────────────────────────────────
export interface WebhookEventDoc {
  _id: string;
  provider: string;
  type: string;
  receivedAt: Date;
  expiresAt: Date;
}
const WebhookEventSchema = new Schema<WebhookEventDoc>({
  _id: { type: String, required: true },
  provider: { type: String, required: true },
  type: { type: String, required: true },
  receivedAt: { type: Date, required: true },
  expiresAt: { type: Date, required: true },
});
WebhookEventSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
export const WebhookEvent = model<WebhookEventDoc>("WebhookEvent", WebhookEventSchema);

// ── Coupons ───────────────────────────────────────────────────────────────────
export interface CouponDoc {
  code: string;
  description: string;
  kind: "percent" | "flat" | "free_shipping";
  valueBps: number;
  valueP: number;
  maxDiscountP: number;
  minSubtotalP: number;
  startsAt: Date;
  endsAt: Date;
  /** 0 = unlimited */
  usageLimit: number;
  perCustomerLimit: number;
  usedCount: number;
  isActive: boolean;
  createdAt?: Date;
}
const CouponSchema = new Schema<CouponDoc>(
  {
    code: { type: String, required: true, uppercase: true, trim: true },
    description: { type: String, default: "" },
    kind: { type: String, enum: ["percent", "flat", "free_shipping"], required: true },
    valueBps: { type: Number, default: 0 },
    valueP: { type: Number, default: 0 },
    maxDiscountP: { type: Number, default: 0 },
    minSubtotalP: { type: Number, default: 0 },
    startsAt: { type: Date, required: true },
    endsAt: { type: Date, required: true },
    usageLimit: { type: Number, default: 0 },
    perCustomerLimit: { type: Number, default: 1 },
    usedCount: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);
CouponSchema.index({ code: 1 }, { unique: true });
export const Coupon = model<CouponDoc>("Coupon", CouponSchema);

export interface CouponRedemptionDoc {
  code: string;
  email: string;
  orderId: string;
  discountP: number;
  status: "reserved" | "consumed" | "released";
}
const CouponRedemptionSchema = new Schema<CouponRedemptionDoc>(
  {
    code: { type: String, required: true },
    email: { type: String, required: true, lowercase: true },
    orderId: { type: String, required: true },
    discountP: { type: Number, required: true },
    status: { type: String, enum: ["reserved", "consumed", "released"], required: true },
  },
  { timestamps: true },
);
CouponRedemptionSchema.index({ code: 1, email: 1, status: 1 });
CouponRedemptionSchema.index({ orderId: 1 }, { unique: true });
export const CouponRedemption = model<CouponRedemptionDoc>("CouponRedemption", CouponRedemptionSchema);

// ── Stock ledger (append-only) ────────────────────────────────────────────────
export interface StockMovementDoc {
  sku: string;
  productId: string;
  type: "receive" | "reserve" | "release" | "sale" | "restock" | "adjust";
  qty: number;
  ref?: string;
  reason?: string;
  actor: Actor;
  createdAt?: Date;
}
const StockMovementSchema = new Schema<StockMovementDoc>(
  {
    sku: { type: String, required: true },
    productId: { type: String, required: true },
    type: { type: String, enum: ["receive", "reserve", "release", "sale", "restock", "adjust"], required: true },
    qty: { type: Number, required: true },
    ref: String,
    reason: String,
    actor: { name: { type: String, required: true }, role: { type: String, required: true }, userId: String },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);
StockMovementSchema.index({ sku: 1, createdAt: -1 });
StockMovementSchema.index({ ref: 1 });
export const StockMovement = model<StockMovementDoc>("StockMovement", StockMovementSchema);

// ── Saved addresses ───────────────────────────────────────────────────────────
export interface AddressDoc {
  userId: string;
  fullName: string;
  phone: string;
  line1: string;
  line2?: string;
  landmark?: string;
  city: string;
  stateCode: string;
  pincode: string;
  isDefault: boolean;
  updatedAt?: Date;
}
const AddressSchema = new Schema<AddressDoc>(
  {
    userId: { type: String, required: true },
    fullName: { type: String, required: true },
    phone: { type: String, required: true },
    line1: { type: String, required: true },
    line2: String,
    landmark: String,
    city: { type: String, required: true },
    stateCode: { type: String, required: true },
    pincode: { type: String, required: true },
    isDefault: { type: Boolean, default: false },
  },
  { timestamps: true },
);
AddressSchema.index({ userId: 1, isDefault: -1, updatedAt: -1 });
export const Address = model<AddressDoc>("Address", AddressSchema);

// ── Store settings (singleton) ────────────────────────────────────────────────
export interface SettingsDoc {
  _id: string;
  freeShippingAboveP: number;
  shippingSlabs: { uptoG: number; priceP: number }[];
  extraPer500gP: number;
  codEnabled: boolean;
  codMaxOrderP: number;
  codFeeP: number;
  giftWrapP: number;
  reservationMinutes: number;
  /** How long after delivery a damage/leak/wrong-item claim can be raised. */
  returnWindowHours: number;
}
const SettingsSchema = new Schema<SettingsDoc>(
  {
    _id: { type: String, default: "store" },
    freeShippingAboveP: { type: Number, default: 149900 },
    shippingSlabs: {
      type: [{ _id: false, uptoG: Number, priceP: Number }],
      default: [
        { uptoG: 500, priceP: 7900 },
        { uptoG: 1000, priceP: 9900 },
      ],
    },
    extraPer500gP: { type: Number, default: 4000 },
    codEnabled: { type: Boolean, default: true },
    codMaxOrderP: { type: Number, default: 500000 },
    codFeeP: { type: Number, default: 4900 },
    giftWrapP: { type: Number, default: 9900 },
    reservationMinutes: { type: Number, default: 30 },
    returnWindowHours: { type: Number, default: 48 },
  },
  { timestamps: true },
);
export const Settings = model<SettingsDoc>("Settings", SettingsSchema);

// ── Audit log (admin actions) ─────────────────────────────────────────────────
export interface AuditLogDoc {
  actor: Actor & { userId: string };
  action: string;
  entity: { kind: string; id: string };
  detail?: unknown;
  createdAt?: Date;
}
const AuditLogSchema = new Schema<AuditLogDoc>(
  {
    actor: { userId: { type: String, required: true }, name: { type: String, required: true }, role: { type: String, required: true } },
    action: { type: String, required: true },
    entity: { kind: { type: String, required: true }, id: { type: String, required: true } },
    detail: Schema.Types.Mixed,
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);
AuditLogSchema.index({ "entity.kind": 1, "entity.id": 1, createdAt: -1 });
AuditLogSchema.index({ createdAt: -1 });
export const AuditLog = model<AuditLogDoc>("AuditLog", AuditLogSchema);

// ── Better Auth's user collection, read by the admin (writes go through Better Auth) ──
export interface AuthUserDoc {
  _id: unknown;
  name?: string;
  email: string;
  emailVerified?: boolean;
  image?: string;
  role?: string;
  phone?: string;
  createdAt?: Date;
}
const AuthUserSchema = new Schema<AuthUserDoc>(
  {
    _id: Schema.Types.Mixed,
    name: String,
    email: String,
    emailVerified: Boolean,
    image: String,
    role: String,
    phone: String,
    createdAt: Date,
  },
  { collection: "user", strict: false, timestamps: false },
);
export const AuthUser = model<AuthUserDoc>("AuthUser", AuthUserSchema);
