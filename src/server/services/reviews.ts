import "server-only";
import { Types } from "mongoose";
import { db } from "@/server/db/connect";
import { Product } from "@/server/models/Product";
import { Order } from "@/server/models/Order";
import { Review } from "@/server/models/engagement";

/** Reviews (docs/08 §6): one per customer per product, verified when they bought it. */

export class ReviewError extends Error {}

/** Has this customer had this product delivered? (by account or by the email they ordered with) */
export async function hasBought(productId: string, user: { id: string; email: string }): Promise<boolean> {
  await db();
  return !!(await Order.exists({ "items.productId": productId, status: "delivered", $or: [{ userId: user.id }, { "contact.email": user.email.toLowerCase() }] }));
}

export async function submitReview(
  user: { id: string; name: string; email: string },
  input: { productId: string; rating: number; title: string; body: string; photos: { url: string; width: number; height: number }[] },
): Promise<{ slug: string }> {
  await db();
  const product = await Product.findOne({ _id: input.productId, status: "active" }).select("slug name").lean();
  if (!product) throw new ReviewError("This product isn't available.");
  const verified = await hasBought(input.productId, user);
  // Editing an existing review sends it back to moderation.
  await Review.updateOne(
    { productId: new Types.ObjectId(input.productId), userId: user.id },
    {
      $set: { rating: input.rating, title: input.title, body: input.body, photos: input.photos, verified, status: "pending", name: user.name, email: user.email, productSlug: product.slug, productName: product.name },
      $unset: { moderatedBy: 1 },
    },
    { upsert: true },
  );
  await recomputeRating(input.productId);
  return { slug: product.slug };
}

/** Product aggregate = approved reviews only. */
export async function recomputeRating(productId: string): Promise<string | undefined> {
  const [agg] = await Review.aggregate<{ avg: number; n: number }>([
    { $match: { productId: new Types.ObjectId(productId), status: "approved" } },
    { $group: { _id: null, avg: { $avg: "$rating" }, n: { $sum: 1 } } },
  ]);
  const p = await Product.findByIdAndUpdate(productId, { $set: { ratingAvg: agg ? Math.round(agg.avg * 10) / 10 : 0, ratingCount: agg?.n ?? 0 } }, { returnDocument: "after" })
    .select("slug")
    .lean();
  return p?.slug;
}
