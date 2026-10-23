import { describe, expect, it } from "vitest";
import { SEED_PRODUCTS } from "@/server/catalog/seed";
import type { ProductDTO } from "@/server/catalog/types";
import { DEFAULT_PRICING, priceCart, shippingFor } from "@/server/services/pricing";

const products: ProductDTO[] = structuredClone(SEED_PRODUCTS);

describe("priceCart", () => {
  it("prices from the catalogue, never from input", () => {
    const view = priceCart([{ sku: "AQ-ARI-50", qty: 2 }], products);
    expect(view.lines[0]?.unitPriceP).toBe(349900);
    expect(view.subtotalP).toBe(699800);
    expect(view.shippingP).toBe(0); // above free-shipping threshold
    expect(view.totalP).toBe(699800);
    expect(view.savingsP).toBe(100000);
  });

  it("charges weight-slab shipping below the threshold", () => {
    const view = priceCart([{ sku: "AQ-ARI-10", qty: 1 }], products);
    expect(view.subtotalP).toBe(119900);
    expect(view.shippingP).toBe(7900);
    expect(view.freeShippingRemainingP).toBe(30000);
  });

  it("drops unknown and inactive SKUs with a warning", () => {
    const view = priceCart([{ sku: "AQ-NOPE-1", qty: 1 }], products);
    expect(view.lines).toHaveLength(0);
    expect(view.warnings).toHaveLength(1);
    expect(view.totalP).toBe(0);
  });

  it("caps quantity at stock and maxPerOrder", () => {
    const p = structuredClone(products);
    const v = p[0]!.variants[2]!; // AQ-ARI-100
    v.stock = 2;
    const view = priceCart([{ sku: v.sku, qty: 5 }], p);
    expect(view.lines[0]?.qty).toBe(2);
    expect(view.warnings[0]).toMatch(/Only 2/);
  });

  it("removes sold-out items", () => {
    const p = structuredClone(products);
    p[0]!.variants[0]!.stock = 0;
    expect(priceCart([{ sku: "AQ-ARI-10", qty: 1 }], p).lines).toHaveLength(0);
  });
});

describe("shippingFor", () => {
  it("uses slabs, then per-500 g increments", () => {
    expect(shippingFor(400, 0, DEFAULT_PRICING)).toBe(7900);
    expect(shippingFor(900, 0, DEFAULT_PRICING)).toBe(9900);
    expect(shippingFor(1600, 0, DEFAULT_PRICING)).toBe(9900 + 2 * 4000);
    expect(shippingFor(0, 0, DEFAULT_PRICING)).toBe(0);
  });
});
