import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { db, isDatabaseConfigured } from "@/server/db/connect";
import { Settings, type BusinessDetails, type SettingsDoc } from "@/server/models/commerce";
import { businessOf } from "@/server/services/settings";

/** Seller details for storefront pages (footer, contact), cached until the owner edits them. */

export const businessTag = "business";

export async function getBusiness(): Promise<BusinessDetails> {
  "use cache";
  cacheLife("content");
  cacheTag(businessTag);
  if (!isDatabaseConfigured()) return businessOf({});
  await db();
  const s = await Settings.findById("store").select("business").lean<Pick<SettingsDoc, "business">>();
  return businessOf(s ?? {});
}
