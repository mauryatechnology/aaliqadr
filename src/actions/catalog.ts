"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { SKU_RE } from "@/lib/sku";
import { getSessionUser } from "@/server/auth";
import { db } from "@/server/db/connect";
import { Product } from "@/server/models/Product";
import { StockAlert } from "@/server/models/engagement";
import { rateLimit, RateLimitError } from "@/server/rate-limit";
import { getProductBySlug } from "@/server/queries/catalog";
import type { ProductDTO } from "@/server/catalog/types";

/** Public product data for the quick view (plan.md §10.2): the same cached DTO as the product page. */
export async function quickViewAction(slug: string): Promise<ProductDTO | null> {
  const s = z.string().regex(/^[a-z0-9-]{1,80}$/).safeParse(slug);
  if (!s.success) return null;
  return getProductBySlug(s.data);
}

/** "Notify me" on a sold-out size (plan.md §10.3). One email when it's back; nothing else. */
export async function notifyMeAction(rawSku: string, rawEmail: string): Promise<{ ok?: boolean; error?: string }> {
  const v = z.object({ sku: z.string().regex(SKU_RE), email: z.email() }).safeParse({ sku: rawSku.toUpperCase(), email: rawEmail.trim().toLowerCase() });
  if (!v.success) return { error: "Enter a valid email address." };
  try {
    const h = await headers();
    await rateLimit("publicWrite", `notify:${h.get("x-forwarded-for")?.split(",")[0]?.trim() || "local"}`);
  } catch (e) {
    if (e instanceof RateLimitError) return { error: e.message };
    throw e;
  }
  await db();
  const p = await Product.findOne({ "variants.sku": v.data.sku, status: "active" }).select("slug").lean();
  if (!p) return { error: "That size isn't available." };
  const user = await getSessionUser();
  await StockAlert.updateOne({ sku: v.data.sku, email: v.data.email }, { $setOnInsert: { sku: v.data.sku, email: v.data.email, productId: p._id, slug: p.slug, userId: user?.id }, $unset: { notifiedAt: 1 } }, { upsert: true });
  return { ok: true };
}
