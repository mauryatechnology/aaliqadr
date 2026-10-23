import "server-only";
import { db } from "@/server/db/connect";
import { Settings, type SettingsDoc } from "@/server/models/commerce";
import type { CheckoutSettings } from "./checkout";
import type { PricingSettings } from "./pricing";

/** Store settings singleton (docs/04 §4.16), created with defaults on first read. */
export async function getSettings(): Promise<SettingsDoc> {
  await db();
  const doc = await Settings.findOneAndUpdate({ _id: "store" }, { $setOnInsert: { _id: "store" } }, { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }).lean<SettingsDoc>();
  if (!doc) throw new Error("Settings could not be loaded");
  return doc;
}

export function pricingSettings(s: SettingsDoc): PricingSettings {
  return { freeShippingAboveP: s.freeShippingAboveP, slabs: s.shippingSlabs, extraPer500gP: s.extraPer500gP };
}

export function checkoutSettings(s: SettingsDoc): CheckoutSettings {
  return { codEnabled: s.codEnabled, codMaxOrderP: s.codMaxOrderP, codFeeP: s.codFeeP, giftWrapP: s.giftWrapP };
}
