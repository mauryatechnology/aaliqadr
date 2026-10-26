import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { DEFAULT_ZONES, type DeliveryZones } from "@/lib/delivery";
import { site } from "@/config/site";
import { db, isDatabaseConfigured } from "@/server/db/connect";
import { Settings, type SettingsDoc } from "@/server/models/commerce";
import { businessOf } from "@/server/services/settings";

/** The store settings a product page needs (plan.md §10.3), cached until an admin changes them. */

export const settingsTag = "settings";

export interface StorefrontSettings {
  codEnabled: boolean;
  codMaxOrderP: number;
  giftWrapP: number;
  freeShippingAboveP: number;
  storeStateCode: string;
  delivery: DeliveryZones;
  qaEnabled: boolean;
  returnWindowHours: number;
}

export async function getStorefrontSettings(): Promise<StorefrontSettings> {
  "use cache";
  cacheLife("content");
  cacheTag(settingsTag);
  const s = isDatabaseConfigured() ? await (async () => { await db(); return Settings.findById("store").lean<SettingsDoc>(); })() : null;
  const d = s?.delivery;
  const pair = (v: number[] | undefined, fb: [number, number]): [number, number] => (v && v.length === 2 ? [v[0]!, v[1]!] : fb);
  return {
    codEnabled: s?.codEnabled ?? true,
    codMaxOrderP: s?.codMaxOrderP ?? 500000,
    giftWrapP: s?.giftWrapP ?? 0,
    freeShippingAboveP: s?.freeShippingAboveP ?? site.freeShippingAboveP,
    storeStateCode: businessOf(s ?? {}).stateCode,
    delivery: { dispatch: pair(d?.dispatch, DEFAULT_ZONES.dispatch), local: pair(d?.local, DEFAULT_ZONES.local), metro: pair(d?.metro, DEFAULT_ZONES.metro), rest: pair(d?.rest, DEFAULT_ZONES.rest), remote: pair(d?.remote, DEFAULT_ZONES.remote) },
    qaEnabled: s?.qaEnabled ?? false,
    returnWindowHours: s?.returnWindowHours ?? 48,
  };
}
