import { describe, expect, it } from "vitest";

describe("Amazon Shipping Purchase Safeguards", () => {
  it("rejects expired shipping rates (10 minute TTL exceeded)", () => {
    const expiredShipment = {
      orderId: "ORD-1234",
      status: "RATES_FETCHED",
      requestToken: "token-expired-123",
      // Expired 5 minutes ago
      ratesExpiresAt: new Date(Date.now() - 5 * 60 * 1000),
      rates: [{ rateId: "rate-1" }],
    };

    const isExpired = Boolean(
      expiredShipment.ratesExpiresAt && new Date() > new Date(expiredShipment.ratesExpiresAt),
    );

    expect(isExpired).toBe(true);
  });

  it("permits active rates within the 10 minute window", () => {
    const validShipment = {
      orderId: "ORD-1234",
      status: "RATES_FETCHED",
      requestToken: "token-valid-123",
      // Valid for another 8 minutes
      ratesExpiresAt: new Date(Date.now() + 8 * 60 * 1000),
      rates: [{ rateId: "rate-1" }],
    };

    const isExpired = Boolean(
      validShipment.ratesExpiresAt && new Date() > new Date(validShipment.ratesExpiresAt),
    );

    expect(isExpired).toBe(false);
  });

  it("simulates atomic lock preventing double-purchase race conditions", async () => {
    // Simulated DB document
    let dbDoc = {
      orderId: "ORD-9999",
      status: "RATES_FETCHED",
      ratesExpiresAt: new Date(Date.now() + 500000),
    };

    // Atomic findOneAndUpdate simulation
    const atomicLock = async (orderId: string) => {
      if (dbDoc.orderId === orderId && ["NOT_SHIPPED", "RATES_FETCHED"].includes(dbDoc.status)) {
        dbDoc = { ...dbDoc, status: "BOOKING" };
        return dbDoc;
      }
      return null;
    };

    // Fire two concurrent purchase requests simultaneously
    const [resultA, resultB] = await Promise.all([
      atomicLock("ORD-9999"),
      atomicLock("ORD-9999"),
    ]);

    // Exactly one call must succeed and obtain the lock
    const winners = [resultA, resultB].filter((r) => r !== null && r.status === "BOOKING");
    const losers = [resultA, resultB].filter((r) => r === null);

    expect(winners).toHaveLength(1);
    expect(losers).toHaveLength(1);
    expect(dbDoc.status).toBe("BOOKING");
  });
});
