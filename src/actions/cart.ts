"use server";

import { getAllProducts } from "@/server/queries/catalog";
import { priceCart, type CartView } from "@/server/services/pricing";
import { getSettings, pricingSettings } from "@/server/services/settings";
import { bagLines } from "@/schemas/checkout";

export type PriceCartResult = { ok: true; data: CartView } | { ok: false; error: string };

/** Read-only: prices the guest cart from the cached catalogue and live store settings (docs/05 §2.2). */
export async function priceCartAction(raw: unknown): Promise<PriceCartResult> {
  const parsed = bagLines.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Your bag could not be read. Please refresh the page." };
  const [products, settings] = await Promise.all([getAllProducts(), getSettings()]);
  return { ok: true, data: priceCart(parsed.data, products, pricingSettings(settings)) };
}
