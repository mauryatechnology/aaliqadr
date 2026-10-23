import { describe, expect, it } from "vitest";
import { SEED_PRODUCTS } from "@/server/catalog/seed";
import { priceCart } from "@/server/services/pricing";
import { allocateDiscount, couponDiscount, quoteCheckout, type CheckoutSettings, type CouponRule } from "@/server/services/checkout";
import { canTransition, customerCanCancel, nextStatuses } from "@/lib/order-status";

const settings: CheckoutSettings = { codEnabled: true, codMaxOrderP: 500000, codFeeP: 4900, giftWrapP: 9900 };
const MP = "23";

const cart = (lines: { sku: string; qty: number }[]) => priceCart(lines, structuredClone(SEED_PRODUCTS));
const pct = (bps: number, extra: Partial<CouponRule> = {}): CouponRule => ({ code: "STAR", kind: "percent", valueBps: bps, valueP: 0, maxDiscountP: 0, minSubtotalP: 0, ...extra });

function sumsExactly(q: ReturnType<typeof quoteCheckout>) {
  expect(q.taxableP + q.cgstP + q.sgstP + q.igstP).toBe(q.totalP);
  expect(q.subtotalP - q.discountP + q.shippingP + q.codFeeP + q.giftWrapP).toBe(q.totalP);
}

describe("quoteCheckout", () => {
  it("intra-state prepaid: CGST + SGST, no fees", () => {
    const q = quoteCheckout({ cart: cart([{ sku: "AQ-ARI-50", qty: 1 }]), method: "razorpay", giftWrap: false, shipToStateCode: MP, storeStateCode: MP, settings });
    expect(q.totalP).toBe(349900);
    expect(q.isInterState).toBe(false);
    expect(q.igstP).toBe(0);
    expect(q.cgstP).toBeGreaterThan(0);
    sumsExactly(q);
  });

  it("inter-state COD with gift wrap and shipping", () => {
    const q = quoteCheckout({ cart: cart([{ sku: "AQ-ARI-10", qty: 1 }]), method: "cod", giftWrap: true, shipToStateCode: "27", storeStateCode: MP, settings });
    expect(q.shippingP).toBe(7900);
    expect(q.codFeeP).toBe(4900);
    expect(q.giftWrapP).toBe(9900);
    expect(q.totalP).toBe(119900 + 7900 + 4900 + 9900);
    expect(q.cgstP + q.sgstP).toBe(0);
    sumsExactly(q);
  });

  it("applies a capped percent coupon and allocates it across lines", () => {
    const q = quoteCheckout({
      cart: cart([{ sku: "AQ-ARI-50", qty: 1 }, { sku: "AQ-LEO-10", qty: 2 }]),
      method: "razorpay", giftWrap: false, shipToStateCode: MP, storeStateCode: MP, settings,
      coupon: pct(1000, { maxDiscountP: 50000 }),
    });
    expect(q.discountP).toBe(50000);
    expect(q.lines.reduce((n, l) => n + l.discountP, 0)).toBe(50000);
    expect(q.couponCode).toBe("STAR");
    sumsExactly(q);
  });

  it("ignores a coupon below its minimum", () => {
    const q = quoteCheckout({ cart: cart([{ sku: "AQ-ARI-10", qty: 1 }]), method: "razorpay", giftWrap: false, shipToStateCode: MP, storeStateCode: MP, settings, coupon: pct(1000, { minSubtotalP: 200000 }) });
    expect(q.discountP).toBe(0);
    expect(q.couponCode).toBeUndefined();
  });

  it("free-shipping coupon zeroes shipping", () => {
    const q = quoteCheckout({ cart: cart([{ sku: "AQ-ARI-10", qty: 1 }]), method: "razorpay", giftWrap: false, shipToStateCode: MP, storeStateCode: MP, settings, coupon: { ...pct(0), kind: "free_shipping" } });
    expect(q.shippingP).toBe(0);
    expect(q.couponCode).toBe("STAR");
    sumsExactly(q);
  });

  it("blocks COD for prepaid-only items and large orders", () => {
    const coffret = quoteCheckout({ cart: cart([{ sku: "AQ-DSC-24", qty: 1 }]), method: "cod", giftWrap: false, shipToStateCode: MP, storeStateCode: MP, settings });
    expect(coffret.codAvailable).toBe(false);
    expect(coffret.codFeeP).toBe(0);
    const big = quoteCheckout({ cart: cart([{ sku: "AQ-ARI-100", qty: 1 }]), method: "cod", giftWrap: false, shipToStateCode: MP, storeStateCode: MP, settings: { ...settings, codMaxOrderP: 300000 } });
    expect(big.codAvailable).toBe(false);
  });
});

describe("discount helpers", () => {
  it("allocation always sums to the discount", () => {
    const lines = cart([{ sku: "AQ-ARI-10", qty: 1 }, { sku: "AQ-TAU-50", qty: 1 }, { sku: "AQ-GEM-100", qty: 1 }]).lines;
    for (const d of [1, 99, 12345, 100000]) expect(allocateDiscount(lines, d).reduce((a, b) => a + b, 0)).toBe(d);
  });
  it("flat coupon never exceeds the subtotal", () => {
    expect(couponDiscount({ ...pct(0), kind: "flat", valueP: 999999 }, 50000, 0).discountP).toBe(50000);
  });
});

describe("order state machine", () => {
  it("allows the happy path and blocks going backwards", () => {
    expect(canTransition("pending_payment", "confirmed")).toBe(true);
    expect(canTransition("confirmed", "shipped")).toBe(true);
    expect(canTransition("shipped", "delivered")).toBe(true);
    expect(canTransition("delivered", "confirmed")).toBe(false);
    expect(canTransition("cancelled", "confirmed")).toBe(false);
    expect(nextStatuses("cancelled")).toEqual([]);
  });
  it("customers cannot cancel after dispatch", () => {
    expect(customerCanCancel("processing")).toBe(true);
    expect(customerCanCancel("shipped")).toBe(false);
  });
});
