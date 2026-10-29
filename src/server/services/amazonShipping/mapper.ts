import type {
  AddressInfo,
  AmazonRateItem,
  GetRatesResult,
  PackageInput,
  PurchaseResult,
  TrackingEventItem,
  TrackingResult,
} from "./types";

export interface OrderLike {
  _id: string;
  contact?: {
    name?: string;
    email?: string;
    phone?: string;
  };
  shippingAddress?: {
    fullName?: string;
    phone?: string;
    line1?: string;
    line2?: string;
    landmark?: string;
    city?: string;
    stateCode?: string;
    state?: string;
    pincode?: string;
  };
  items?: Array<{
    productId?: string;
    sku?: string;
    name?: string;
    variantLabel?: string;
    qty?: number;
    unitPriceP?: number;
    mrpP?: number;
  }>;
  pricing?: {
    totalP?: number;
    subtotalP?: number;
  };
}

export interface ConfigLike {
  mode: "sandbox" | "production";
  businessId: string;
  currency: string;
  weightUnit: string;
  dimensionUnit: string;
  useSandboxSampleAddress: boolean;
  warehouse: {
    name: string;
    addressLine1: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    email: string;
    phone: string;
  };
}

/**
 * Builds the Amazon SP-API Shipping v2 Rates request payload from our Order and package inputs.
 */
export function toAmazonRatesRequest(order: OrderLike, pkg: PackageInput, config: ConfigLike) {
  const shipFrom: AddressInfo = {
    name: config.warehouse.name,
    addressLine1: config.warehouse.addressLine1,
    city: config.warehouse.city,
    stateOrRegion: config.warehouse.state,
    postalCode: config.warehouse.postalCode,
    countryCode: config.warehouse.country,
    email: config.warehouse.email,
    phoneNumber: config.warehouse.phone,
  };

  let shipTo: AddressInfo;

  if (config.mode === "sandbox" && config.useSandboxSampleAddress) {
    // Known-working US sample address for Amazon sandbox rate calls
    shipTo = {
      name: order.contact?.name || order.shippingAddress?.fullName || "Jane Doe",
      addressLine1: "111 Congress Ave",
      city: "Austin",
      stateOrRegion: "TX",
      postalCode: "78701",
      countryCode: "US",
      email: order.contact?.email || "customer@example.com",
      phoneNumber: order.contact?.phone || order.shippingAddress?.phone || "5125550199",
    };
  } else {
    // Customer delivery address
    const addr = order.shippingAddress;
    shipTo = {
      name: addr?.fullName || order.contact?.name || "Customer",
      addressLine1: addr?.line1 || "Street Address",
      addressLine2: addr?.line2 || undefined,
      city: addr?.city || "",
      stateOrRegion: addr?.stateCode || addr?.state || "",
      postalCode: addr?.pincode || "",
      countryCode: "IN",
      email: order.contact?.email,
      phoneNumber: addr?.phone || order.contact?.phone,
    };
  }

  const items = (order.items || []).map((item, idx) => ({
    itemValue: {
      value: Math.max(1, Math.round(((item.unitPriceP || item.mrpP || 100) / 100))),
      unit: config.currency,
    },
    description: item.name ? `${item.name} (${item.variantLabel || ""})`.trim() : `Item ${idx + 1}`,
    itemIdentifier: item.sku || `sku-${idx + 1}`,
    quantity: item.qty || 1,
    weight: {
      value: Math.max(0.1, Number((pkg.weight.value / Math.max(1, (order.items || []).length)).toFixed(2))),
      unit: pkg.weight.unit || config.weightUnit,
    },
  }));

  const insuredValue = pkg.insuredValue || {
    value: Math.max(1, Math.round((order.pricing?.totalP || 1000) / 100)),
    unit: config.currency,
  };

  return {
    channelDetails: {
      channelType: "EXTERNAL",
    },
    shipFrom,
    shipTo,
    packages: [
      {
        packageClientReferenceId: pkg.packageClientReferenceId || `${order._id}-pkg-1`,
        dimensions: {
          length: Number(pkg.dimensions.length),
          width: Number(pkg.dimensions.width),
          height: Number(pkg.dimensions.height),
          unit: pkg.dimensions.unit || config.dimensionUnit,
        },
        weight: {
          value: Number(pkg.weight.value),
          unit: pkg.weight.unit || config.weightUnit,
        },
        insuredValue,
        items: items.length > 0 ? items : undefined,
      },
    ],
  };
}

/**
 * Strips heavy base64 contents from raw payload so logs and DB remain clean.
 */
export function sanitizeRawMeta(data: unknown): Record<string, unknown> {
  if (!data || typeof data !== "object") return {};
  try {
    const copy = JSON.parse(JSON.stringify(data));
    const cleanObject = (obj: Record<string, unknown>) => {
      for (const [k, v] of Object.entries(obj)) {
        if (typeof v === "string" && v.length > 500 && (k.toLowerCase().includes("content") || k.toLowerCase().includes("document"))) {
          obj[k] = `[BASE64_OMITTED_LENGTH_${v.length}]`;
        } else if (v && typeof v === "object") {
          cleanObject(v as Record<string, unknown>);
        }
      }
    };
    cleanObject(copy);
    return copy;
  } catch {
    return { sanitized: true };
  }
}

/**
 * Defensively parses the Amazon SP-API rates response.
 */
export function fromAmazonRatesResponse(raw: Record<string, unknown>): GetRatesResult {
  const payload = (raw.payload as Record<string, unknown>) || raw;
  const requestToken = String(payload.requestToken || raw.requestToken || "");

  const rawRates = Array.isArray(payload.rates)
    ? payload.rates
    : Array.isArray(raw.rates)
      ? raw.rates
      : [];

  const rates: AmazonRateItem[] = rawRates.map((r: Record<string, unknown>, idx: number) => {
    // Extract total charge safely
    let totalCharge: { value: number; unit: string } | undefined = undefined;

    if (r.totalCharge && typeof r.totalCharge === "object") {
      const tc = r.totalCharge as Record<string, unknown>;
      totalCharge = {
        value: typeof tc.value === "number" ? tc.value : Number(tc.value) || 0,
        unit: String(tc.unit || tc.currency || "USD"),
      };
    } else if (Array.isArray(r.rateItemList) && r.rateItemList.length > 0) {
      const firstItem = r.rateItemList[0] as Record<string, unknown>;
      const chargeValue = firstItem.chargeValue as Record<string, unknown> | undefined;
      if (chargeValue) {
        totalCharge = {
          value: Number(chargeValue.value) || 0,
          unit: String(chargeValue.unit || chargeValue.currency || "USD"),
        };
      }
    }

    return {
      rateId: String(r.rateId || `rate-${idx + 1}`),
      carrierId: String(r.carrierId || ""),
      carrierName: String(r.carrierName || r.carrierId || "Amazon Shipping"),
      serviceId: String(r.serviceId || `service-${idx + 1}`),
      serviceName: String(r.serviceName || r.serviceId || "Standard"),
      totalCharge,
      promise: r.promise as AmazonRateItem["promise"],
      ...r,
    };
  });

  return {
    requestToken,
    rates,
    rawMeta: sanitizeRawMeta(raw),
  };
}

/**
 * Defensively parses the Amazon SP-API shipment purchase response.
 */
export function fromAmazonPurchaseResponse(raw: Record<string, unknown>): PurchaseResult {
  const payload = (raw.payload as Record<string, unknown>) || raw;
  const shipmentId = String(payload.shipmentId || raw.shipmentId || "");

  // Observed sandbox response can have packageDocumentDetail (object) or packageDocumentDetails (array)
  let packageDetail: Record<string, unknown> | undefined = undefined;

  if (payload.packageDocumentDetail && typeof payload.packageDocumentDetail === "object") {
    packageDetail = payload.packageDocumentDetail as Record<string, unknown>;
  } else if (Array.isArray(payload.packageDocumentDetails) && payload.packageDocumentDetails.length > 0) {
    packageDetail = payload.packageDocumentDetails[0] as Record<string, unknown>;
  } else if (Array.isArray(payload.packages) && payload.packages.length > 0) {
    packageDetail = payload.packages[0] as Record<string, unknown>;
  }

  const trackingId = String(
    packageDetail?.trackingId ||
      payload.trackingId ||
      raw.trackingId ||
      "",
  );

  const carrierId = String(
    packageDetail?.carrierId ||
      payload.carrierId ||
      raw.carrierId ||
      "",
  );

  const packageClientReferenceId =
    packageDetail?.packageClientReferenceId !== null && packageDetail?.packageClientReferenceId !== undefined
      ? String(packageDetail.packageClientReferenceId)
      : undefined;

  // Extract base64 label if included directly in response
  let labelContentsBase64: string | undefined = undefined;
  const docs = Array.isArray(packageDetail?.packageDocuments)
    ? (packageDetail?.packageDocuments as Array<Record<string, unknown>>)
    : Array.isArray(payload.packageDocuments)
      ? (payload.packageDocuments as Array<Record<string, unknown>>)
      : [];

  const labelDoc = docs.find((d) => String(d.type).toUpperCase() === "LABEL") || docs[0];
  if (labelDoc && typeof labelDoc.contents === "string" && labelDoc.contents.length > 0) {
    labelContentsBase64 = labelDoc.contents;
  }

  return {
    shipmentId,
    trackingId: trackingId || undefined,
    carrierId: carrierId || undefined,
    packageClientReferenceId,
    labelContentsBase64,
    rawMeta: sanitizeRawMeta(raw),
  };
}

/**
 * Defensively formats location object or string into a clean string.
 */
function formatLocation(loc: unknown): string | undefined {
  if (!loc) return undefined;
  if (typeof loc === "string") return loc;
  if (typeof loc === "object") {
    const o = loc as Record<string, unknown>;
    const parts = [o.city, o.stateOrRegion, o.postalCode, o.countryCode].filter(Boolean);
    return parts.length > 0 ? parts.join(", ") : undefined;
  }
  return undefined;
}

/**
 * Maps Amazon event codes to standard shipment statuses.
 */
export function mapAmazonEventCodeToStatus(code: string): "IN_TRANSIT" | "OUT_FOR_DELIVERY" | "DELIVERED" | null {
  const c = code.trim().toLowerCase();

  if (c === "delivered") {
    return "DELIVERED";
  }

  if (c === "outfordelivery" || c === "out_for_delivery") {
    return "OUT_FOR_DELIVERY";
  }

  if (
    [
      "readyforreceive",
      "ready_for_receive",
      "pickupdone",
      "pickup_done",
      "received",
      "departed",
      "intransit",
      "in_transit",
      "arrived",
      "scanned",
    ].includes(c)
  ) {
    return "IN_TRANSIT";
  }

  return null;
}

/**
 * Defensively parses the Amazon SP-API tracking response.
 */
export function fromAmazonTrackingResponse(raw: Record<string, unknown>): TrackingResult {
  const payload = (raw.payload as Record<string, unknown>) || raw;
  const trackingId = String(payload.trackingId || raw.trackingId || "");
  const carrierId = String(payload.carrierId || raw.carrierId || "");

  const rawHistory = Array.isArray(payload.eventHistory)
    ? payload.eventHistory
    : Array.isArray(raw.eventHistory)
      ? raw.eventHistory
      : [];

  const events: TrackingEventItem[] = rawHistory.map((ev: Record<string, unknown>) => {
    const code = String(ev.eventCode || ev.code || "Unknown");
    const rawTime = ev.eventTime || ev.time;
    let time: Date;
    try {
      time = rawTime ? new Date(String(rawTime)) : new Date();
      if (isNaN(time.getTime())) time = new Date();
    } catch {
      time = new Date();
    }

    const location = formatLocation(ev.location);
    const description = String(ev.eventDescription || ev.description || code);

    return {
      code,
      time,
      location,
      description,
    };
  });

  // Sort events chronologically (latest first)
  events.sort((a, b) => b.time.getTime() - a.time.getTime());

  // Determine current status based on latest recognized event
  let currentStatus = "BOOKED";
  for (const ev of events) {
    const mapped = mapAmazonEventCodeToStatus(ev.code);
    if (mapped) {
      currentStatus = mapped;
      break;
    }
  }

  return {
    trackingId,
    carrierId: carrierId || undefined,
    currentStatus,
    events,
    rawMeta: sanitizeRawMeta(raw),
  };
}
