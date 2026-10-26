import "server-only";
import { db } from "@/server/db/connect";
import { Settings, type BusinessDetails, type SettingsDoc } from "@/server/models/commerce";
import { site } from "@/config/site";
import type { CheckoutSettings } from "./checkout";
import type { PricingSettings } from "./pricing";

/** Store settings singleton (docs/04 §4.16), created with defaults on first read. */
export async function getSettings(): Promise<SettingsDoc> {
  await db();
  const doc = await Settings.findOneAndUpdate({ _id: "store" }, { $setOnInsert: { _id: "store" } }, { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }).lean<SettingsDoc>();
  if (!doc) throw new Error("Settings could not be loaded");
  return doc;
}

/** Seller details: what the owner saved in Settings, over the defaults in config/site.ts. */
export function businessOf(s: Pick<SettingsDoc, "business">): BusinessDetails {
  const b = s.business;
  return {
    legalName: b?.legalName || site.legal.legalName,
    address: b?.address || site.legal.address,
    city: b?.city || site.legal.city,
    state: b?.state || site.legal.state,
    stateCode: b?.stateCode || site.legal.stateCode,
    gstin: b?.gstin ?? site.legal.gstin,
    supportPhone: b?.supportPhone || site.support.phone,
    supportEmail: b?.supportEmail ?? site.support.email,
  };
}

/** The invoice's seller block, frozen onto the order when the invoice number is issued. */
export const sellerSnapshot = (b: BusinessDetails) => ({ legalName: b.legalName, address: b.address, gstin: b.gstin, stateCode: b.stateCode });

export function pricingSettings(s: SettingsDoc): PricingSettings {
  return { freeShippingAboveP: s.freeShippingAboveP, slabs: s.shippingSlabs, extraPer500gP: s.extraPer500gP };
}

export function checkoutSettings(s: SettingsDoc): CheckoutSettings {
  return { codEnabled: s.codEnabled, codMaxOrderP: s.codMaxOrderP, codFeeP: s.codFeeP, giftWrapP: s.giftWrapP };
}
