import "server-only";
import type { ZodiacSlug } from "@/config/zodiac";
import { ORDER_STATUSES, type OrderStatus } from "@/lib/order-status";
import { db } from "@/server/db/connect";
import { Order, type OrderDoc } from "@/server/models/Order";
import { Product } from "@/server/models/Product";
import { AuditLog, AuthUser, Coupon, Payment, StockMovement, type AuditLogDoc, type AuthUserDoc, type CouponDoc, type PaymentDoc, type StockMovementDoc } from "@/server/models/commerce";
import { fromDoc, type LeanProduct } from "@/server/queries/catalog";
import type { ProductDTO } from "@/server/catalog/types";

/** Admin reads (docs/11). Never cached; always called after the page's own role check. */

const REVENUE_STATUSES: OrderStatus[] = ["confirmed", "processing", "shipped", "delivered"];

function istStartOfDay(daysAgo = 0): Date {
  const now = new Date();
  const ist = new Date(now.getTime() + 5.5 * 3600_000);
  ist.setUTCHours(0, 0, 0, 0);
  return new Date(ist.getTime() - 5.5 * 3600_000 - daysAgo * 86_400_000);
}

async function revenueSince(from: Date) {
  const [r] = await Order.aggregate<{ total: number; count: number }>([
    { $match: { status: { $in: REVENUE_STATUSES }, createdAt: { $gte: from } } },
    { $group: { _id: null, total: { $sum: "$pricing.totalP" }, count: { $sum: 1 } } },
  ]);
  return { totalP: r?.total ?? 0, count: r?.count ?? 0 };
}

export async function getDashboard() {
  await db();
  const [today, week, month, toShip, awaitingPayment, recent, bySign, lowStock] = await Promise.all([
    revenueSince(istStartOfDay(0)),
    revenueSince(istStartOfDay(6)),
    revenueSince(istStartOfDay(29)),
    Order.countDocuments({ status: { $in: ["confirmed", "processing"] } }),
    Order.countDocuments({ status: "pending_payment" }),
    Order.find().sort({ createdAt: -1 }).limit(8).select("_id createdAt status contact.name pricing.totalP payment").lean<OrderDoc[]>(),
    Order.aggregate<{ _id: ZodiacSlug | null; qty: number; revenueP: number }>([
      { $match: { status: { $in: REVENUE_STATUSES }, createdAt: { $gte: istStartOfDay(29) } } },
      { $unwind: "$items" },
      { $group: { _id: "$items.zodiacSign", qty: { $sum: "$items.qty" }, revenueP: { $sum: { $subtract: ["$items.lineTotalP", "$items.discountP"] } } } },
      { $sort: { revenueP: -1 } },
    ]),
    Product.aggregate<{ name: string; sku: string; label: string; stock: number; threshold: number }>([
      { $match: { status: "active" } },
      { $unwind: "$variants" },
      { $match: { "variants.isActive": true, $expr: { $lte: ["$variants.stock", "$variants.lowStockThreshold"] } } },
      { $project: { _id: 0, name: 1, sku: "$variants.sku", label: "$variants.label", stock: "$variants.stock", threshold: "$variants.lowStockThreshold" } },
      { $sort: { stock: 1 } },
      { $limit: 8 },
    ]),
  ]);
  return { today, week, month, toShip, awaitingPayment, recent, bySign, lowStock };
}

export const ORDER_TABS = {
  all: { label: "All", statuses: [...ORDER_STATUSES] },
  to_ship: { label: "To ship", statuses: ["confirmed", "processing"] },
  pending_payment: { label: "Awaiting payment", statuses: ["pending_payment"] },
  shipped: { label: "Shipped", statuses: ["shipped"] },
  delivered: { label: "Delivered", statuses: ["delivered"] },
  cancelled: { label: "Cancelled", statuses: ["cancelled", "returned"] },
} as const satisfies Record<string, { label: string; statuses: readonly OrderStatus[] }>;
export type OrderTab = keyof typeof ORDER_TABS;

export const PAGE_SIZE = 25;

export async function listOrders(tab: OrderTab, q: string, page: number) {
  await db();
  const filter: Record<string, unknown> = { status: { $in: ORDER_TABS[tab].statuses } };
  const term = q.trim();
  if (term) {
    const safe = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").slice(0, 60);
    filter.$or = [{ _id: term.toUpperCase() }, { "contact.email": { $regex: safe, $options: "i" } }, { "contact.phone": { $regex: safe } }, { "contact.name": { $regex: safe, $options: "i" } }];
  }
  const [rows, total, counts] = await Promise.all([
    Order.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * PAGE_SIZE)
      .limit(PAGE_SIZE)
      .select("_id createdAt status contact pricing.totalP payment items.qty shipment.awb")
      .lean<OrderDoc[]>(),
    Order.countDocuments(filter),
    Order.aggregate<{ _id: OrderStatus; n: number }>([{ $group: { _id: "$status", n: { $sum: 1 } } }]),
  ]);
  const byStatus = Object.fromEntries(counts.map((c) => [c._id, c.n])) as Partial<Record<OrderStatus, number>>;
  const tabCounts = Object.fromEntries(
    Object.entries(ORDER_TABS).map(([k, t]) => [k, t.statuses.reduce((n, s) => n + (byStatus[s] ?? 0), 0)]),
  ) as Record<OrderTab, number>;
  return { rows, total, tabCounts };
}

export async function getAdminOrder(id: string) {
  if (!/^AQ-\d{6,}$/.test(id)) return null;
  await db();
  const [order, payments, audit] = await Promise.all([
    Order.findById(id).select("+notesInternal +accessKey").lean<OrderDoc>(),
    Payment.find({ orderId: id }).sort({ createdAt: 1 }).lean<PaymentDoc[]>(),
    AuditLog.find({ "entity.kind": "order", "entity.id": id }).sort({ createdAt: -1 }).limit(20).lean<AuditLogDoc[]>(),
  ]);
  return order ? { order, payments, audit } : null;
}

export async function listProductsAdmin(): Promise<(ProductDTO & { status: string })[]> {
  await db();
  const docs = await Product.find().sort({ sortOrder: 1, createdAt: 1 }).lean<(LeanProduct & { status: string })[]>();
  return docs.map((d) => ({ ...fromDoc(d), status: d.status }));
}

export async function getProductAdmin(id: string): Promise<(ProductDTO & { status: string; seoTitle?: string; seoDescription?: string }) | null> {
  if (!/^[a-f0-9]{24}$/.test(id)) return null;
  await db();
  const d = await Product.findById(id).lean<LeanProduct & { status: string }>();
  return d ? { ...fromDoc(d), status: d.status, seoTitle: d.seo?.title ?? undefined, seoDescription: d.seo?.description ?? undefined } : null;
}

export async function listInventory() {
  await db();
  const [variants, movements] = await Promise.all([
    Product.aggregate<{ productId: string; name: string; status: string; sku: string; label: string; stock: number; reserved: number; threshold: number; isActive: boolean }>([
      { $unwind: "$variants" },
      { $project: { _id: 0, productId: { $toString: "$_id" }, name: 1, status: 1, sku: "$variants.sku", label: "$variants.label", stock: "$variants.stock", reserved: "$variants.reserved", threshold: "$variants.lowStockThreshold", isActive: "$variants.isActive" } },
      { $sort: { name: 1, sku: 1 } },
    ]),
    StockMovement.find().sort({ createdAt: -1 }).limit(25).lean<StockMovementDoc[]>(),
  ]);
  return { variants, movements };
}

export async function listCustomers(q: string) {
  await db();
  const term = q.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&").slice(0, 60);
  const filter = term ? { $or: [{ email: { $regex: term, $options: "i" } }, { name: { $regex: term, $options: "i" } }] } : {};
  const users = await AuthUser.find(filter).sort({ createdAt: -1 }).limit(100).lean<AuthUserDoc[]>();
  const emails = users.map((u) => u.email.toLowerCase());
  const stats = await Order.aggregate<{ _id: string; orders: number; spentP: number; last: Date }>([
    { $match: { "contact.email": { $in: emails }, status: { $in: REVENUE_STATUSES } } },
    { $group: { _id: "$contact.email", orders: { $sum: 1 }, spentP: { $sum: "$pricing.totalP" }, last: { $max: "$createdAt" } } },
  ]);
  const byEmail = new Map(stats.map((s) => [s._id, s]));
  return users.map((u) => ({
    id: String(u._id),
    name: u.name ?? "",
    email: u.email,
    role: u.role ?? "customer",
    joined: u.createdAt,
    orders: byEmail.get(u.email.toLowerCase())?.orders ?? 0,
    spentP: byEmail.get(u.email.toLowerCase())?.spentP ?? 0,
    lastOrder: byEmail.get(u.email.toLowerCase())?.last,
  }));
}

export async function listCoupons() {
  await db();
  return Coupon.find().sort({ createdAt: -1 }).lean<(CouponDoc & { _id: { toString(): string } })[]>();
}
