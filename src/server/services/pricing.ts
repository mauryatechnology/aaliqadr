import type { ZodiacSlug } from "@/config/zodiac";
import type { Paise } from "@/lib/money";
import type { ProductDTO } from "@/server/catalog/types";

/**
 * Cart pricing (docs/07 §2). Pure: given catalogue data and requested lines, returns the
 * authoritative view. The client never supplies a price. Coupons, COD fee and the GST split
 * are added on top of this result by `quoteCheckout` (services/checkout.ts).
 */

export interface PricingSettings {
  freeShippingAboveP: Paise;
  /** Ascending weight slabs; weight above the last slab adds `extraPer500gP` per 500 g. */
  slabs: { uptoG: number; priceP: Paise }[];
  extraPer500gP: Paise;
}

export const DEFAULT_PRICING: PricingSettings = {
  freeShippingAboveP: 149900,
  slabs: [
    { uptoG: 500, priceP: 7900 },
    { uptoG: 1000, priceP: 9900 },
  ],
  extraPer500gP: 4000,
};

export interface CartLineInput {
  sku: string;
  qty: number;
}

export interface PricedLine {
  productId: string;
  sku: string;
  slug: string;
  name: string;
  variantLabel: string;
  zodiacSign?: ZodiacSlug;
  image?: string;
  qty: number;
  unitPriceP: Paise;
  mrpP: Paise;
  lineTotalP: Paise;
  available: number;
  maxQty: number;
  weightG: number;
  hsnCode: string;
  gstRateBps: number;
  codAllowed: boolean;
}

export interface CartView {
  lines: PricedLine[];
  itemCount: number;
  subtotalP: Paise;
  savingsP: Paise;
  shippingP: Paise;
  totalP: Paise;
  freeShippingRemainingP: Paise;
  warnings: string[];
}

export function shippingFor(weightG: number, subtotalP: Paise, s: PricingSettings): Paise {
  if (weightG <= 0 || subtotalP >= s.freeShippingAboveP) return 0;
  const slab = s.slabs.find((x) => weightG <= x.uptoG);
  if (slab) return slab.priceP;
  const last = s.slabs.at(-1);
  if (!last) return 0;
  return last.priceP + Math.ceil((weightG - last.uptoG) / 500) * s.extraPer500gP;
}

export function priceCart(input: CartLineInput[], products: ProductDTO[], settings: PricingSettings = DEFAULT_PRICING): CartView {
  const bySku = new Map(products.flatMap((p) => p.variants.map((v) => [v.sku, { p, v }] as const)));
  const warnings: string[] = [];
  const lines: PricedLine[] = [];
  let weightG = 0;

  for (const { sku, qty: requested } of input) {
    const hit = bySku.get(sku);
    if (!hit || !hit.v.isActive) {
      warnings.push("An item in your bag is no longer available and was removed.");
      continue;
    }
    const { p, v } = hit;
    const maxQty = Math.min(v.maxPerOrder, Math.max(v.stock, 0));
    if (maxQty === 0) {
      warnings.push(`${p.name} (${v.label}) is sold out and was removed.`);
      continue;
    }
    const qty = Math.min(requested, maxQty);
    if (qty < requested) warnings.push(`Only ${qty} of ${p.name} (${v.label}) can be ordered.`);
    weightG += v.weightG * qty;
    lines.push({
      productId: p.id,
      sku,
      slug: p.slug,
      name: p.name,
      variantLabel: v.label,
      zodiacSign: p.zodiacSign,
      image: p.media[0]?.url,
      qty,
      unitPriceP: v.priceP,
      mrpP: v.mrpP,
      lineTotalP: v.priceP * qty,
      available: v.stock,
      maxQty,
      weightG: v.weightG,
      hsnCode: p.hsnCode,
      gstRateBps: p.gstRateBps,
      codAllowed: v.codAllowed,
    });
  }

  const subtotalP = lines.reduce((n, l) => n + l.lineTotalP, 0);
  const savingsP = lines.reduce((n, l) => n + (l.mrpP - l.unitPriceP) * l.qty, 0);
  const shippingP = shippingFor(weightG, subtotalP, settings);
  return {
    lines,
    itemCount: lines.reduce((n, l) => n + l.qty, 0),
    subtotalP,
    savingsP,
    shippingP,
    totalP: subtotalP + shippingP,
    freeShippingRemainingP: subtotalP > 0 ? Math.max(0, settings.freeShippingAboveP - subtotalP) : 0,
    warnings: [...new Set(warnings)],
  };
}
