import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { db, isDatabaseConfigured } from "@/server/db/connect";
import { Order } from "@/server/models/Order";
import { getProductCards, tags } from "@/server/queries/catalog";
import type { ProductCardDTO } from "@/server/catalog/types";

/** "Frequently bought together" (plan.md §10.3): products that share orders with this one. */
export async function getBoughtTogether(productId: string, limit = 2): Promise<ProductCardDTO[]> {
  "use cache";
  cacheLife("catalog");
  cacheTag(tags.products);
  if (!isDatabaseConfigured()) return [];
  await db();
  const rows = await Order.aggregate<{ _id: string; n: number }>([
    { $match: { "items.productId": productId, status: { $in: ["confirmed", "processing", "shipped", "delivered"] } } },
    { $sort: { createdAt: -1 } },
    { $limit: 2000 },
    { $unwind: "$items" },
    { $match: { "items.productId": { $ne: productId } } },
    { $group: { _id: "$items.productId", n: { $sum: 1 } } },
    { $sort: { n: -1 } },
    { $limit: 6 },
  ]);
  const cards = await getProductCards();
  const byId = new Map(cards.map((c) => [c.id, c]));
  return rows.map((r) => byId.get(r._id)).filter((c): c is ProductCardDTO => !!c && c.inStock && !!c.defaultSku).slice(0, limit);
}
