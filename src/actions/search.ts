"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { db } from "@/server/db/connect";
import { SearchLog } from "@/server/models/engagement";
import { rateLimit, RateLimitError } from "@/server/rate-limit";
import { searchSuggestions, type Suggestions } from "@/server/queries/search";

/** Storefront search overlay (plan.md §9.2): instant results and anonymous analytics. */

async function ipKey() {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "local";
}

const query = z.string().trim().min(1).max(60);

export async function suggestAction(raw: string): Promise<Suggestions | { error: string }> {
  const q = query.safeParse(raw);
  if (!q.success) return { products: [], categories: [], collections: [], signs: [], notes: [], suggestion: null };
  try {
    await rateLimit("search", await ipKey());
  } catch (e) {
    if (e instanceof RateLimitError) return { error: e.message };
    throw e;
  }
  return searchSuggestions(q.data);
}

const event = z.object({ q: query, event: z.enum(["search", "click", "add"]), results: z.number().int().min(0).max(10000).optional(), slug: z.string().max(80).regex(/^[a-z0-9-]*$/).optional() });

/** Logs a search, a click on a result, or an add to bag after searching. No person, no IP. */
export async function trackSearchAction(raw: unknown): Promise<void> {
  const v = event.safeParse(raw);
  if (!v.success) return;
  try {
    await rateLimit("search", `log:${await ipKey()}`);
    await db();
    await SearchLog.create({ ...v.data, q: v.data.q.toLowerCase() });
  } catch {
    // Analytics never gets in the shopper's way.
  }
}
