import { describe, expect, it } from "vitest";
import {
  fromAmazonPurchaseResponse,
  fromAmazonRatesResponse,
  fromAmazonTrackingResponse,
  mapAmazonEventCodeToStatus,
  toAmazonRatesRequest,
  type ConfigLike,
  type OrderLike,
} from "../src/server/services/amazonShipping/mapper";
import type { PackageInput } from "../src/server/services/amazonShipping/types";

describe("Amazon Shipping Mapper", () => {
  const dummyWarehouse = {
    name: "Aaliqadr Warehouse",
    addressLine1: "Industrial Area Phase 2",
    city: "Mumbai",
    state: "MH",
    postalCode: "400001",
    country: "IN",
    email: "warehouse@aaliqadr.com",
    phone: "9876543210",
  };

  const sampleOrder: OrderLike = {
    _id: "ORD-9999",
    contact: {
      name: "Rohan Sharma",
      email: "rohan@example.com",
      phone: "919876543210",
    },
    shippingAddress: {
      fullName: "Rohan Sharma",
      line1: "Flat 402, Star Towers",
      city: "Bengaluru",
      state: "Karnataka",
      stateCode: "KA",
      pincode: "560001",
      phone: "919876543210",
    },
    items: [
      {
        sku: "AQ-ARIES-50ML",
        name: "Aries Eau de Parfum",
        variantLabel: "50ml",
        qty: 1,
        unitPriceP: 299900,
      },
    ],
    pricing: {
      totalP: 299900,
    },
  };

  const samplePackage: PackageInput = {
    dimensions: {
      length: 8,
      width: 6,
      height: 4,
      unit: "INCH",
    },
    weight: {
      value: 1.5,
      unit: "POUND",
    },
  };

  it("builds rates request using sample US address in sandbox mode when flag is true", () => {
    const config: ConfigLike = {
      mode: "sandbox",
      businessId: "AmazonShipping_US",
      currency: "USD",
      weightUnit: "POUND",
      dimensionUnit: "INCH",
      useSandboxSampleAddress: true,
      warehouse: dummyWarehouse,
    };

    const req = toAmazonRatesRequest(sampleOrder, samplePackage, config);

    expect(req.channelDetails.channelType).toBe("EXTERNAL");
    expect(req.shipTo.city).toBe("Austin");
    expect(req.shipTo.stateOrRegion).toBe("TX");
    expect(req.shipTo.postalCode).toBe("78701");
    expect(req.shipTo.countryCode).toBe("US");
    expect(req.packages[0]!.dimensions.unit).toBe("INCH");
    expect(req.packages[0]!.weight.unit).toBe("POUND");
    expect(req.packages[0]!.packageClientReferenceId).toBe("ORD-9999-pkg-1");
  });

  it("builds rates request using real customer address when mode is production", () => {
    const config: ConfigLike = {
      mode: "production",
      businessId: "AmazonShipping_US",
      currency: "USD",
      weightUnit: "POUND",
      dimensionUnit: "INCH",
      useSandboxSampleAddress: true, // Should be ignored in production
      warehouse: dummyWarehouse,
    };

    const req = toAmazonRatesRequest(sampleOrder, samplePackage, config);

    expect(req.shipTo.city).toBe("Bengaluru");
    expect(req.shipTo.postalCode).toBe("560001");
    expect(req.shipTo.countryCode).toBe("IN");
  });

  it("defensively parses Amazon rates response with missing/null fields", () => {
    const mockRaw = {
      payload: {
        requestToken: "token-abc-123",
        rates: [
          {
            rateId: "rate-standard-1",
            carrierId: "AMZN_US",
            carrierName: "Amazon Shipping",
            serviceId: "std",
            serviceName: "Standard Delivery",
            totalCharge: {
              value: 12.5,
              unit: "USD",
            },
            promise: {
              deliveryWindow: {
                deliverTime: "2026-11-01T18:00:00Z",
              },
            },
          },
          {
            // Edge case: missing carrierName and totalCharge format variation
            rateId: "rate-express-2",
            serviceId: "exp",
            rateItemList: [
              {
                chargeValue: { value: 19.99, currency: "USD" },
              },
            ],
          },
        ],
      },
    };

    const parsed = fromAmazonRatesResponse(mockRaw);

    expect(parsed.requestToken).toBe("token-abc-123");
    expect(parsed.rates).toHaveLength(2);
    expect(parsed.rates[0]!.rateId).toBe("rate-standard-1");
    expect(parsed.rates[0]!.totalCharge?.value).toBe(12.5);
    expect(parsed.rates[1]!.carrierName).toBe("Amazon Shipping"); // Fallback
    expect(parsed.rates[1]!.totalCharge?.value).toBe(19.99);
  });

  it("defensively parses purchase response in sandbox shape (single packageDocumentDetail with null client ref)", () => {
    const mockRaw = {
      payload: {
        shipmentId: "amzn-ship-777",
        packageDocumentDetail: {
          packageClientReferenceId: null, // Observed in sandbox
          trackingId: "TBA1234567890",
          carrierId: "AMZN_US",
          packageDocuments: [
            {
              type: "LABEL",
              format: "PNG",
              contents: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
            },
          ],
        },
      },
    };

    const parsed = fromAmazonPurchaseResponse(mockRaw);

    expect(parsed.shipmentId).toBe("amzn-ship-777");
    expect(parsed.trackingId).toBe("TBA1234567890");
    expect(parsed.packageClientReferenceId).toBeUndefined();
    expect(parsed.labelContentsBase64).toContain("iVBORw0KGgoAAAANSUhEUg");
  });

  it("defensively parses purchase response with packageDocumentDetails array", () => {
    const mockRaw = {
      payload: {
        shipmentId: "amzn-ship-888",
        packageDocumentDetails: [
          {
            packageClientReferenceId: "ORD-9999-1",
            trackingId: "TBA987654321",
            carrierId: "AMZN_US",
          },
        ],
      },
    };

    const parsed = fromAmazonPurchaseResponse(mockRaw);

    expect(parsed.shipmentId).toBe("amzn-ship-888");
    expect(parsed.trackingId).toBe("TBA987654321");
    expect(parsed.packageClientReferenceId).toBe("ORD-9999-1");
  });

  it("maps tracking event codes correctly to standard statuses", () => {
    expect(mapAmazonEventCodeToStatus("ReadyForReceive")).toBe("IN_TRANSIT");
    expect(mapAmazonEventCodeToStatus("PickupDone")).toBe("IN_TRANSIT");
    expect(mapAmazonEventCodeToStatus("Received")).toBe("IN_TRANSIT");
    expect(mapAmazonEventCodeToStatus("InTransit")).toBe("IN_TRANSIT");
    expect(mapAmazonEventCodeToStatus("OutForDelivery")).toBe("OUT_FOR_DELIVERY");
    expect(mapAmazonEventCodeToStatus("Delivered")).toBe("DELIVERED");
    expect(mapAmazonEventCodeToStatus("CustomHoldCode")).toBeNull();
  });

  it("defensively parses tracking response with 2019 sandbox dates and object location", () => {
    const mockRaw = {
      payload: {
        trackingId: "TBA1234567890",
        carrierId: "AMZN_US",
        eventHistory: [
          {
            eventCode: "PickupDone",
            eventTime: "2019-07-28T16:00:00Z",
            location: {
              city: "Seattle",
              stateOrRegion: "WA",
              postalCode: "98101",
              countryCode: "US",
            },
          },
          {
            eventCode: "OutForDelivery",
            eventTime: "2019-07-29T08:30:00Z",
            location: "Austin, TX",
          },
        ],
      },
    };

    const parsed = fromAmazonTrackingResponse(mockRaw);

    expect(parsed.trackingId).toBe("TBA1234567890");
    expect(parsed.events).toHaveLength(2);
    // Events sorted latest first
    expect(parsed.events[0]!.code).toBe("OutForDelivery");
    expect(parsed.events[0]!.location).toBe("Austin, TX");
    expect(parsed.events[1]!.code).toBe("PickupDone");
    expect(parsed.events[1]!.location).toBe("Seattle, WA, 98101, US");
    expect(parsed.currentStatus).toBe("OUT_FOR_DELIVERY");
  });
});
