"use server";

import { z } from "zod";
import { getSessionUser } from "@/server/auth";
import { mergeWishlist, setWishlistAlerts, setWishlisted } from "@/server/services/wishlist";
import { rateLimit, RateLimitError } from "@/server/rate-limit";

/** Wishlist sync (plan.md §11.3). Guests: nothing is stored here; the browser keeps the list. */

const slug = z.string().regex(/^[a-z0-9-]{1,80}$/);

export async function toggleWishlistAction(rawSlug: string, on: boolean): Promise<{ signedIn: boolean }> {
  const user = await getSessionUser();
  if (!user) return { signedIn: false };
  try {
    await rateLimit("search", `wish:${user.id}`);
    await setWishlisted(user.id, slug.parse(rawSlug), on);
  } catch (e) {
    if (!(e instanceof RateLimitError)) throw e;
  }
  return { signedIn: true };
}

export async function syncWishlistAction(local: string[]): Promise<string[] | null> {
  const user = await getSessionUser();
  if (!user) return null;
  return mergeWishlist(user.id, z.array(slug).max(200).catch([]).parse(local));
}

export async function wishlistAlertsAction(rawSlug: string, alerts: { price?: boolean; stock?: boolean }): Promise<{ ok: boolean }> {
  const user = await getSessionUser();
  if (!user) return { ok: false };
  await setWishlistAlerts(user.id, slug.parse(rawSlug), z.object({ price: z.boolean().optional(), stock: z.boolean().optional() }).parse(alerts));
  return { ok: true };
}
