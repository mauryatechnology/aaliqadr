import { describe, expect, it } from "vitest";
import {
  fromAmazonTrackingResponse,
  mapAmazonEventCodeToStatus,
} from "../src/server/services/amazonShipping/mapper";

describe("Amazon Shipping Tracking Status Mapping", () => {
  it("maps ReadyForReceive, PickupDone, and Received to IN_TRANSIT", () => {
    expect(mapAmazonEventCodeToStatus("ReadyForReceive")).toBe("IN_TRANSIT");
    expect(mapAmazonEventCodeToStatus("ready_for_receive")).toBe("IN_TRANSIT");
    expect(mapAmazonEventCodeToStatus("PickupDone")).toBe("IN_TRANSIT");
    expect(mapAmazonEventCodeToStatus("Received")).toBe("IN_TRANSIT");
    expect(mapAmazonEventCodeToStatus("Departed")).toBe("IN_TRANSIT");
  });

  it("maps OutForDelivery to OUT_FOR_DELIVERY", () => {
    expect(mapAmazonEventCodeToStatus("OutForDelivery")).toBe("OUT_FOR_DELIVERY");
    expect(mapAmazonEventCodeToStatus("out_for_delivery")).toBe("OUT_FOR_DELIVERY");
  });

  it("maps Delivered to DELIVERED", () => {
    expect(mapAmazonEventCodeToStatus("Delivered")).toBe("DELIVERED");
    expect(mapAmazonEventCodeToStatus("delivered")).toBe("DELIVERED");
  });

  it("returns null for unknown carrier event codes without crashing", () => {
    expect(mapAmazonEventCodeToStatus("UnknownCode_1234")).toBeNull();
    expect(mapAmazonEventCodeToStatus("SecurityInspection")).toBeNull();
  });

  it("parses tracking payload and preserves all events idempotently", () => {
    const raw = {
      payload: {
        trackingId: "TBA1234567890",
        carrierId: "AMZN_US",
        eventHistory: [
          {
            eventCode: "PickupDone",
            eventTime: "2019-07-28T16:00:00Z",
            location: "Warehouse A",
          },
          {
            eventCode: "CustomCarrierCheck",
            eventTime: "2019-07-28T18:00:00Z",
            location: "Transit Hub",
          },
          {
            eventCode: "OutForDelivery",
            eventTime: "2019-07-29T08:00:00Z",
            location: "Local Delivery Center",
          },
        ],
      },
    };

    const parsed = fromAmazonTrackingResponse(raw);

    expect(parsed.trackingId).toBe("TBA1234567890");
    expect(parsed.events).toHaveLength(3);
    // Highest priority / latest event sets currentStatus
    expect(parsed.currentStatus).toBe("OUT_FOR_DELIVERY");
    // Unknown event code was preserved
    expect(parsed.events.some((e) => e.code === "CustomCarrierCheck")).toBe(true);
  });
});
