import "server-only";
import mongoose, { Schema, type Model } from "mongoose";
import { ZODIAC_SLUGS, type ZodiacSlug } from "@/config/zodiac";
import { ORDER_STATUSES, PAYMENT_METHODS, PAYMENT_STATUSES, type OrderStatus, type PaymentMethod, type PaymentStatus } from "@/lib/order-status";

/** Orders snapshot everything they show (docs/04 §4.8): an invoice never re-reads the catalogue. */

export interface OrderAddress {
  fullName: string;
  phone: string;
  line1: string;
  line2?: string;
  landmark?: string;
  city: string;
  stateCode: string;
  state: string;
  pincode: string;
}

export interface OrderItem {
  productId: string;
  slug: string;
  sku: string;
  name: string;
  variantLabel: string;
  zodiacSign?: ZodiacSlug;
  qty: number;
  mrpP: number;
  unitPriceP: number;
  discountP: number;
  lineTotalP: number;
  hsnCode: string;
  gstRateBps: number;
}

export interface OrderHistoryEntry {
  at: Date;
  status: string;
  note?: string;
  actor: { name: string; role: string; userId?: string };
  visibleToCustomer: boolean;
}

export interface OrderPricing {
  subtotalP: number;
  discountP: number;
  couponCode?: string;
  shippingP: number;
  codFeeP: number;
  giftWrapP: number;
  taxableP: number;
  cgstP: number;
  sgstP: number;
  igstP: number;
  totalP: number;
}

export interface OrderDoc {
  _id: string;
  userId?: string;
  accessKey: string;
  idempotencyKey?: string;
  contact: { name: string; email: string; phone: string };
  shippingAddress: OrderAddress;
  items: OrderItem[];
  pricing: OrderPricing;
  placeOfSupply: { stateCode: string; isInterState: boolean };
  gift: { wrap: boolean; message?: string; hidePrice: boolean };
  status: OrderStatus;
  payment: { method: PaymentMethod; status: PaymentStatus; razorpayOrderId?: string; razorpayPaymentId?: string; paidAt?: Date; refundedP: number };
  shipment?: { courier?: string; awb?: string; trackingUrl?: string; shippedAt?: Date; deliveredAt?: Date };
  invoice?: { number?: string; issuedAt?: Date };
  reservationExpiresAt?: Date;
  history: OrderHistoryEntry[];
  notesInternal?: string;
  createdAt: Date;
  updatedAt: Date;
}

const AddressSchema = new Schema<OrderAddress>(
  {
    fullName: { type: String, required: true },
    phone: { type: String, required: true },
    line1: { type: String, required: true },
    line2: String,
    landmark: String,
    city: { type: String, required: true },
    stateCode: { type: String, required: true },
    state: { type: String, required: true },
    pincode: { type: String, required: true },
  },
  { _id: false },
);

const ItemSchema = new Schema<OrderItem>(
  {
    productId: { type: String, required: true },
    slug: { type: String, required: true },
    sku: { type: String, required: true },
    name: { type: String, required: true },
    variantLabel: { type: String, required: true },
    zodiacSign: { type: String, enum: ZODIAC_SLUGS },
    qty: { type: Number, required: true, min: 1 },
    mrpP: { type: Number, required: true },
    unitPriceP: { type: Number, required: true },
    discountP: { type: Number, default: 0 },
    lineTotalP: { type: Number, required: true },
    hsnCode: { type: String, required: true },
    gstRateBps: { type: Number, required: true },
  },
  { _id: false },
);

const HistorySchema = new Schema<OrderHistoryEntry>(
  {
    at: { type: Date, required: true },
    status: { type: String, required: true },
    note: String,
    actor: { name: { type: String, required: true }, role: { type: String, required: true }, userId: String },
    visibleToCustomer: { type: Boolean, default: true },
  },
  { _id: false },
);

const OrderSchema = new Schema<OrderDoc>(
  {
    _id: { type: String, required: true },
    userId: { type: String, index: true },
    /** Random secret in guest confirmation links; owners also reach the order through their account. */
    accessKey: { type: String, required: true, select: false },
    idempotencyKey: { type: String },
    contact: { name: { type: String, required: true }, email: { type: String, required: true, lowercase: true }, phone: { type: String, required: true } },
    shippingAddress: { type: AddressSchema, required: true },
    items: { type: [ItemSchema], required: true },
    pricing: {
      subtotalP: { type: Number, required: true },
      discountP: { type: Number, default: 0 },
      couponCode: String,
      shippingP: { type: Number, default: 0 },
      codFeeP: { type: Number, default: 0 },
      giftWrapP: { type: Number, default: 0 },
      taxableP: { type: Number, required: true },
      cgstP: { type: Number, default: 0 },
      sgstP: { type: Number, default: 0 },
      igstP: { type: Number, default: 0 },
      totalP: { type: Number, required: true },
    },
    placeOfSupply: { stateCode: { type: String, required: true }, isInterState: { type: Boolean, required: true } },
    gift: { wrap: { type: Boolean, default: false }, message: String, hidePrice: { type: Boolean, default: false } },
    status: { type: String, enum: ORDER_STATUSES, required: true },
    payment: {
      method: { type: String, enum: PAYMENT_METHODS, required: true },
      status: { type: String, enum: PAYMENT_STATUSES, required: true },
      razorpayOrderId: String,
      razorpayPaymentId: String,
      paidAt: Date,
      refundedP: { type: Number, default: 0 },
    },
    shipment: {
      courier: String,
      awb: String,
      trackingUrl: String,
      shippedAt: Date,
      deliveredAt: Date,
    },
    invoice: { number: String, issuedAt: Date },
    reservationExpiresAt: Date,
    history: { type: [HistorySchema], default: [] },
    notesInternal: { type: String, select: false },
  },
  { timestamps: true },
);

OrderSchema.index({ createdAt: -1 });
OrderSchema.index({ status: 1, createdAt: -1 });
OrderSchema.index({ "contact.email": 1, createdAt: -1 });
OrderSchema.index({ "payment.razorpayOrderId": 1 }, { unique: true, partialFilterExpression: { "payment.razorpayOrderId": { $type: "string" } } });
OrderSchema.index({ "payment.razorpayPaymentId": 1 }, { unique: true, partialFilterExpression: { "payment.razorpayPaymentId": { $type: "string" } } });
OrderSchema.index({ idempotencyKey: 1 }, { unique: true, partialFilterExpression: { idempotencyKey: { $type: "string" } } });
OrderSchema.index({ "invoice.number": 1 }, { unique: true, partialFilterExpression: { "invoice.number": { $type: "string" } } });
OrderSchema.index({ reservationExpiresAt: 1 }, { partialFilterExpression: { status: "pending_payment" } });

export const Order: Model<OrderDoc> = (mongoose.models.Order as Model<OrderDoc>) ?? mongoose.model<OrderDoc>("Order", OrderSchema);
