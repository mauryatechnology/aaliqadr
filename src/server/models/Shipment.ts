import "server-only";
import mongoose, { Schema, type Model } from "mongoose";

export const SHIPMENT_STATUSES = [
  "NOT_SHIPPED",
  "RATES_FETCHED",
  "BOOKING",
  "BOOKED",
  "IN_TRANSIT",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "FAILED",
  "CANCELLED",
] as const;

export type ShipmentStatus = (typeof SHIPMENT_STATUSES)[number];

export interface ShipmentRate {
  rateId: string;
  carrierId: string;
  carrierName: string;
  serviceId: string;
  serviceName: string;
  totalCharge?: {
    value: number;
    unit?: string;
    currency?: string;
  };
  promise?: {
    deliveryWindow?: {
      receiveTime?: string;
      deliverTime?: string;
    };
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export interface ShipmentPackageInfo {
  weight: {
    value: number;
    unit: string;
  };
  dimensions: {
    length: number;
    width: number;
    height: number;
    unit: string;
  };
  insuredValue?: {
    value: number;
    unit: string;
  };
}

export interface ShipmentTrackingEvent {
  code: string;
  time: Date;
  location?: string;
  description?: string;
}

export interface ShipmentErrorEntry {
  at: Date;
  message: string;
  code?: string;
  stack?: string;
}

export interface ShipmentDoc {
  _id: string;
  orderId: string;
  provider: "amazon_shipping" | string;
  status: ShipmentStatus;
  requestToken?: string;
  rates: ShipmentRate[];
  ratesExpiresAt?: Date;
  selectedRate?: ShipmentRate;
  amazonShipmentId?: string;
  trackingId?: string;
  carrierId?: string;
  packageClientReferenceId?: string;
  labelPath?: string;
  labelUrl?: string;
  packageInfo?: ShipmentPackageInfo;
  trackingEvents: ShipmentTrackingEvent[];
  currentStatus?: string;
  lastTrackedAt?: Date;
  rawMeta?: Record<string, unknown>;
  errors: ShipmentErrorEntry[];
  createdAt: Date;
  updatedAt: Date;
}

const ShipmentRateSchema = new Schema<ShipmentRate>(
  {
    rateId: { type: String, required: true },
    carrierId: { type: String, default: "" },
    carrierName: { type: String, default: "" },
    serviceId: { type: String, default: "" },
    serviceName: { type: String, default: "" },
    totalCharge: {
      value: Number,
      unit: String,
      currency: String,
    },
    promise: Schema.Types.Mixed,
  },
  { _id: false },
);

const TrackingEventSchema = new Schema<ShipmentTrackingEvent>(
  {
    code: { type: String, required: true },
    time: { type: Date, required: true },
    location: String,
    description: String,
  },
  { _id: false },
);

const ErrorEntrySchema = new Schema<ShipmentErrorEntry>(
  {
    at: { type: Date, default: Date.now },
    message: { type: String, required: true },
    code: String,
    stack: String,
  },
  { _id: false },
);

const ShipmentSchema = new Schema<ShipmentDoc>(
  {
    orderId: { type: String, required: true, ref: "Order" },
    provider: { type: String, default: "amazon_shipping" },
    status: { type: String, enum: SHIPMENT_STATUSES, default: "NOT_SHIPPED", index: true },
    requestToken: String,
    rates: { type: [ShipmentRateSchema], default: [] },
    ratesExpiresAt: Date,
    selectedRate: Schema.Types.Mixed,
    amazonShipmentId: String,
    trackingId: { type: String, index: true },
    carrierId: String,
    packageClientReferenceId: String,
    labelPath: String,
    labelUrl: String,
    packageInfo: {
      weight: { value: Number, unit: String },
      dimensions: { length: Number, width: Number, height: Number, unit: String },
      insuredValue: { value: Number, unit: String },
    },
    trackingEvents: { type: [TrackingEventSchema], default: [] },
    currentStatus: String,
    lastTrackedAt: Date,
    rawMeta: Schema.Types.Mixed,
    errors: { type: [ErrorEntrySchema], default: [] },
  },
  { timestamps: true, suppressReservedKeysWarning: true },
);

// Indexes
ShipmentSchema.index({ orderId: 1, createdAt: -1 });
ShipmentSchema.index({ status: 1, lastTrackedAt: 1 });

// Partial unique index: one order cannot have multiple concurrent active shipments
ShipmentSchema.index(
  { orderId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      status: { $in: ["BOOKING", "BOOKED", "IN_TRANSIT", "OUT_FOR_DELIVERY"] },
    },
  },
);

export const Shipment: Model<ShipmentDoc> =
  (mongoose.models.Shipment as Model<ShipmentDoc>) ?? mongoose.model<ShipmentDoc>("Shipment", ShipmentSchema);
