import "server-only";
import { after } from "next/server";
import { Types } from "mongoose";
import { site } from "@/config/site";
import { routes } from "@/lib/routes";
import { db } from "@/server/db/connect";
import { Product } from "@/server/models/Product";
import { AuthUser } from "@/server/models/commerce";
import { StockAlert, WishlistItem } from "@/server/models/engagement";
import { sendMail } from "@/server/email/mailer";
import { backInStockEmail, priceDropEmail } from "@/server/email/templates";

/** Back-in-stock and price-drop emails (plan.md §10.3, §11.3). Sent after the response. */

/** Runs after the response when there is one (actions, routes); otherwise right away (scripts). */
function later(fn: () => Promise<void>) {
  try {
    after(fn);
  } catch {
    void fn().catch((e) => console.error(JSON.stringify({ evt: "alerts.failed", error: (e as Error).message })));
  }
}

const productUrl = (slug: string, sku?: string) => new URL(`${routes.product(slug)}${sku ? `?v=${sku}` : ""}`, site.url).toString();

/** Call after stock went up: emails everyone waiting for a size that is now available. */
export function notifyRestock(productId: string, skus: string[]) {
  later(async () => {
    await db();
    const p = await Product.findById(productId).select("name slug status variants.sku variants.label variants.stock variants.isActive").lean();
    if (!p || p.status !== "active") return;
    for (const v of p.variants.filter((x) => skus.includes(x.sku) && x.stock > 0 && x.isActive !== false)) {
      const waiting = await StockAlert.find({ sku: v.sku, notifiedAt: { $exists: false } }).limit(500).lean();
      for (const a of waiting) {
        if (await sendMail(backInStockEmail(a.email, { name: p.name, variant: v.label, url: productUrl(p.slug, v.sku) }))) await StockAlert.updateOne({ _id: a._id }, { $set: { notifiedAt: new Date() } });
      }
      // Wishlisters who asked for stock alerts on this product.
      const wishers = await WishlistItem.find({ productId: p._id, "alerts.stock": true }).select("userId").lean();
      const users = await AuthUser.find({ _id: { $in: wishers.map((w) => (Types.ObjectId.isValid(w.userId) ? new Types.ObjectId(w.userId) : w.userId)) } }).select("email").lean();
      for (const u of users) await sendMail(backInStockEmail(u.email, { name: p.name, variant: v.label, url: productUrl(p.slug, v.sku) }));
      if (wishers.length) await WishlistItem.updateMany({ productId: p._id, "alerts.stock": true }, { $set: { "alerts.stock": false } });
    }
  });
}

/** Call after a save lowered a product's lowest price: tells wishlisters who opted in. */
export function notifyPriceDrop(productId: string, newLowestP: number) {
  later(async () => {
    await db();
    const p = await Product.findById(productId).select("name slug status").lean();
    if (!p || p.status !== "active") return;
    const rows = await WishlistItem.find({ productId: p._id, "alerts.price": true, priceAtAddP: { $gt: newLowestP } }).limit(1000).lean();
    if (!rows.length) return;
    const users = await AuthUser.find({ _id: { $in: rows.map((r) => (Types.ObjectId.isValid(r.userId) ? new Types.ObjectId(r.userId) : r.userId)) } }).select("email").lean();
    const email = new Map(users.map((u) => [String(u._id), u.email]));
    for (const r of rows) {
      const to = email.get(r.userId);
      if (to && (await sendMail(priceDropEmail(to, { name: p.name, fromP: r.priceAtAddP, toP: newLowestP, url: productUrl(p.slug) })))) await WishlistItem.updateOne({ _id: r._id }, { $set: { priceAtAddP: newLowestP } });
    }
  });
}
