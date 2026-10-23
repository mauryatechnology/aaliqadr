import "server-only";
import type { ZodiacSlug } from "@/config/zodiac";
import { ORDER_STATUSES, type OrderStatus } from "@/lib/order-status";
import { db } from "@/server/db/connect";
import { Order, type OrderDoc } from "@/server/models/Order";
import { Product } from "@/server/models/Product";
import { AuditLog, AuthUser, Coupon, Payment, StockMovement, type AuditLogDoc, type AuthUserDoc, type CouponDoc, type PaymentDoc, type StockMovementDoc } from "@/server/models/commerce";
import { Types } from "mongoose";
import { Category, Collection, HsnCode, type CategoryDoc, type CollectionDoc, type HsnCodeDoc } from "@/server/models/catalog";
import { categoryFromDoc, collectionFromDoc, collectionProducts, descendantIds, fromDoc, type LeanProduct } from "@/server/queries/catalog";
import type { CategoryDTO, ProductDTO } from "@/server/catalog/types";
import { productToInput } from "./product-form";

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

export const PRODUCT_SORTS = {
  manual: { label: "Store order", sort: { sortOrder: 1, name: 1 } },
  name: { label: "Name A–Z", sort: { name: 1 } },
  newest: { label: "Newest", sort: { createdAt: -1 } },
  updated: { label: "Recently edited", sort: { updatedAt: -1 } },
  bestselling: { label: "Best-selling", sort: { salesCount: -1 } },
} as const;
export type ProductSort = keyof typeof PRODUCT_SORTS;

export interface ProductFilters {
  q: string;
  status?: "active" | "draft" | "archived";
  categoryId?: string;
  collectionId?: string;
  stock?: "out" | "low";
  sort: ProductSort;
  page: number;
}

export type AdminProductRow = ProductDTO & { status: string; category?: string };

export async function listProductsAdmin(f: ProductFilters) {
  await db();
  const filter: Record<string, unknown> = {};
  if (f.status) filter.status = f.status;
  const term = f.q.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&").slice(0, 60);
  if (term) filter.$or = [{ name: { $regex: term, $options: "i" } }, { slug: { $regex: term, $options: "i" } }, { "variants.sku": { $regex: term, $options: "i" } }, { tags: term.toLowerCase() }];
  const [categories, collection] = await Promise.all([
    Category.find().select("name parentId").lean<CategoryDoc[]>(),
    f.collectionId && /^[a-f0-9]{24}$/.test(f.collectionId) ? Collection.findById(f.collectionId).lean<CollectionDoc>() : null,
  ]);
  if (f.categoryId && /^[a-f0-9]{24}$/.test(f.categoryId)) {
    const ids = descendantIds(categories.map(categoryFromDoc), f.categoryId);
    filter.categoryId = { $in: [...ids].map((id) => new Types.ObjectId(id)) };
  }
  if (f.stock === "out") filter.variants = { $not: { $elemMatch: { isActive: true, stock: { $gt: 0 } } } };
  if (f.stock === "low") {
    filter.$expr ={ $gt: [{ $size: { $filter: { input: "$variants", as: "v", cond: { $and: ["$$v.isActive", { $lte: ["$$v.stock", "$$v.lowStockThreshold"] }] } } } }, 0] };
  }

  let docs = await Product.find(filter).sort(PRODUCT_SORTS[f.sort].sort).lean<(LeanProduct & { status: string })[]>();
  if (collection) {
    const all = docs.map(fromDoc);
    const ids = new Set(collectionProducts(collectionFromDoc(collection), all, categories.map(categoryFromDoc)).map((p) => p.id));
    docs = docs.filter((d) => ids.has(String(d._id)));
  }
  const catName = new Map(categories.map((c) => [String(c._id), c.name]));
  const total = docs.length;
  const rows: AdminProductRow[] = docs
    .slice((f.page - 1) * PAGE_SIZE, f.page * PAGE_SIZE)
    .map((d) => ({ ...fromDoc(d), status: d.status, category: d.categoryId ? catName.get(String(d.categoryId)) : undefined }));
  const counts = await Product.aggregate<{ _id: string; n: number }>([{ $group: { _id: "$status", n: { $sum: 1 } } }]);
  return { rows, total, statusCounts: Object.fromEntries(counts.map((c) => [c._id, c.n])) as Record<string, number> };
}

/** Everything the product editor needs besides the product. */
export async function getEditorLookups() {
  await db();
  const [categories, collections, hsn] = await Promise.all([
    Category.find().sort({ sortOrder: 1, name: 1 }).lean<CategoryDoc[]>(),
    Collection.find({ kind: "manual" }).sort({ sortOrder: 1, name: 1 }).select("name slug isActive").lean<CollectionDoc[]>(),
    HsnCode.find({ isActive: true }).sort({ code: 1 }).lean<HsnCodeDoc[]>(),
  ]);
  return {
    categories: categoryOptions(categories.map(categoryFromDoc)),
    collections: collections.map((c) => ({ id: String(c._id), name: c.name, isActive: c.isActive })),
    hsn: hsn.map((h) => ({ code: h.code, description: h.description, gstRatePercent: h.gstRateBps / 100 })),
  };
}

/** Categories as an indented, ordered option list ("Perfumes", "— Zodiac Extraits"). */
export function categoryOptions(all: CategoryDTO[]): { id: string; label: string; depth: number; name: string; parentId?: string; isActive: boolean }[] {
  const out: { id: string; label: string; depth: number; name: string; parentId?: string; isActive: boolean }[] = [];
  const walk = (parent: string | undefined, depth: number) => {
    for (const c of all.filter((x) => x.parentId === parent).toSorted((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name))) {
      out.push({ id: c.id, label: `${"— ".repeat(depth)}${c.name}`, depth, name: c.name, parentId: c.parentId, isActive: c.isActive });
      if (depth < 5) walk(c.id, depth + 1);
    }
  };
  walk(undefined, 0);
  return out;
}

export async function getProductEditor(id: string) {
  if (!/^[a-f0-9]{24}$/.test(id)) return null;
  await db();
  const d = await Product.findById(id).lean<LeanProduct & { status: string }>();
  if (!d) return null;
  const collectionIds = (await Collection.find({ kind: "manual", productIds: new Types.ObjectId(String(d._id)) }).select("_id").lean()).map((c) => String(c._id));
  const ordered = await Order.distinct("items.sku", { "items.sku": { $in: d.variants.map((v) => v.sku) } });
  return { value: productToInput(d, collectionIds), orderedSkus: ordered as string[] };
}

export async function listCategoriesAdmin() {
  await db();
  const [cats, counts] = await Promise.all([
    Category.find().lean<CategoryDoc[]>(),
    Product.aggregate<{ _id: unknown; n: number }>([{ $group: { _id: "$categoryId", n: { $sum: 1 } } }]),
  ]);
  const n = new Map(counts.map((c) => [String(c._id), c.n]));
  const all = cats.map(categoryFromDoc);
  return categoryOptions(all).map((o) => ({ ...all.find((c) => c.id === o.id)!, depth: o.depth, products: n.get(o.id) ?? 0 }));
}

export async function listCollectionsAdmin() {
  await db();
  const [cols, docs, cats] = await Promise.all([
    Collection.find().sort({ sortOrder: 1, name: 1 }).lean<CollectionDoc[]>(),
    Product.find({ status: "active" }).lean<LeanProduct[]>(),
    Category.find().lean<CategoryDoc[]>(),
  ]);
  const products = docs.map(fromDoc);
  const categories = cats.map(categoryFromDoc);
  return cols.map((c) => {
    const dto = collectionFromDoc(c);
    return { ...dto, liveProducts: collectionProducts(dto, products, categories).length };
  });
}

export async function getCollectionAdmin(id: string) {
  if (!/^[a-f0-9]{24}$/.test(id)) return null;
  await db();
  const c = await Collection.findById(id).lean<CollectionDoc>();
  return c ? collectionFromDoc(c) : null;
}

/** Light product list for pickers (any status). */
export async function listProductPicker() {
  await db();
  const docs = await Product.find().sort({ sortOrder: 1, name: 1 }).select("name slug status zodiacSign media variants.sku").lean();
  return docs.map((d) => ({ id: String(d._id), name: d.name, slug: d.slug, status: d.status as string, image: d.media?.find((m) => m.kind !== "video")?.url, sign: d.zodiacSign ?? undefined }));
}

export async function listHsnAdmin() {
  await db();
  const [codes, usage] = await Promise.all([
    HsnCode.find().sort({ code: 1 }).lean<HsnCodeDoc[]>(),
    Product.aggregate<{ _id: string; n: number }>([{ $group: { _id: "$hsnCode", n: { $sum: 1 } } }]),
  ]);
  const n = new Map(usage.map((u) => [u._id, u.n]));
  return codes.map((h) => ({ id: String(h._id), code: h.code, description: h.description, gstRatePercent: h.gstRateBps / 100, isActive: h.isActive, products: n.get(h.code) ?? 0 }));
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
