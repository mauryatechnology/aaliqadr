import "server-only";
import { Types } from "mongoose";
import { db } from "@/server/db/connect";
import { Product } from "@/server/models/Product";
import { WishlistItem } from "@/server/models/engagement";

/** Server side of the wishlist (plan.md §11.3). */

const MAX = 200;

async function productsBySlug(slugs: string[]) {
  const docs = await Product.find({ slug: { $in: slugs.slice(0, MAX) }, status: "active" }).select("slug variants.priceP variants.isActive").lean();
  return new Map(docs.map((d) => [d.slug, { id: d._id as Types.ObjectId, priceP: Math.min(...d.variants.filter((v) => v.isActive !== false).map((v) => v.priceP), Infinity) }]));
}

export async function setWishlisted(userId: string, slug: string, on: boolean) {
  await db();
  const p = (await productsBySlug([slug])).get(slug);
  if (!p) return;
  if (on) await WishlistItem.updateOne({ userId, productId: p.id }, { $setOnInsert: { userId, productId: p.id, slug, priceAtAddP: Number.isFinite(p.priceP) ? p.priceP : 0 } }, { upsert: true });
  else await WishlistItem.deleteOne({ userId, productId: p.id });
}

/** Adds the browser's hearts to the account and returns the merged list (newest first). */
export async function mergeWishlist(userId: string, local: string[]): Promise<string[]> {
  await db();
  const found = await productsBySlug(local);
  const count = await WishlistItem.countDocuments({ userId });
  const room = Math.max(0, MAX - count);
  const ops = [...found.entries()].slice(0, room).map(([slug, p]) => ({
    updateOne: { filter: { userId, productId: p.id }, update: { $setOnInsert: { userId, productId: p.id, slug, priceAtAddP: Number.isFinite(p.priceP) ? p.priceP : 0 } }, upsert: true },
  }));
  if (ops.length) await WishlistItem.bulkWrite(ops);
  const rows = await WishlistItem.find({ userId }).sort({ createdAt: -1 }).select("slug").lean();
  return rows.map((r) => r.slug);
}

export async function listWishlist(userId: string) {
  await db();
  return WishlistItem.find({ userId }).sort({ createdAt: -1 }).lean();
}

export async function setWishlistAlerts(userId: string, slug: string, alerts: { price?: boolean; stock?: boolean }) {
  await db();
  const set: Record<string, boolean> = {};
  if (alerts.price !== undefined) set["alerts.price"] = alerts.price;
  if (alerts.stock !== undefined) set["alerts.stock"] = alerts.stock;
  await WishlistItem.updateOne({ userId, slug }, { $set: set });
}
