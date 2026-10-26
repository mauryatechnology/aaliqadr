import "server-only";
import type { ZodiacSlug } from "@/config/zodiac";
import type { OrderStatus } from "@/lib/order-status";
import { db } from "@/server/db/connect";
import { Order, type OrderDoc } from "@/server/models/Order";
import { Product } from "@/server/models/Product";
import { ReturnRequest, Review } from "@/server/models/engagement";
import { AuditLog, Payment, type AuditLogDoc, type PaymentDoc } from "@/server/models/commerce";
import { Types } from "mongoose";
import { Category, Collection, HsnCode, ProductDraft, type CategoryDoc, type CollectionDoc, type HsnCodeDoc } from "@/server/models/catalog";
import { categoryFromDoc, collectionFromDoc, collectionProducts, fromDoc, type LeanProduct } from "@/server/queries/catalog";
import type { CategoryDTO } from "@/server/catalog/types";
import { productToInput } from "./product-form";
import type { ProductInput } from "@/schemas/product";

/** Admin reads (docs/11). Never cached; always called after the page's own role check. */

const REVENUE_STATUSES: OrderStatus[] = ["confirmed", "processing", "shipped", "delivered"];


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

export async function getProductEditor(id: string, { withCost = false } = {}) {
  if (!/^[a-f0-9]{24}$/.test(id)) return null;
  await db();
  const d = await Product.findById(id).select(withCost ? "+variants.costP" : "").lean<LeanProduct & { status: string }>();
  if (!d) return null;
  const collectionIds = (await Collection.find({ kind: "manual", productIds: new Types.ObjectId(String(d._id)) }).select("_id").lean()).map((c) => String(c._id));
  const ordered = await Order.distinct("items.sku", { "items.sku": { $in: d.variants.map((v) => v.sku) } });
  const draft = await ProductDraft.findById(d._id).lean();
  return {
    value: productToInput(d, collectionIds, withCost),
    orderedSkus: ordered as string[],
    draft: draft ? { value: JSON.parse(JSON.stringify(draft.value)) as ProductInput, by: draft.savedBy?.name ?? "", at: draft.updatedAt.toISOString() } : null,
  };
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

/** Products and their variants for the bulk editor (plan.md §8.5): the fields it can change. */
export async function listBulkEdit() {
  await db();
  const docs = await Product.find().sort({ sortOrder: 1, name: 1 }).limit(300).select("name slug status categoryId badges variants.sku variants.label variants.mrpP variants.priceP variants.isActive").lean();
  return docs.map((d) => ({
    id: String(d._id),
    name: d.name,
    slug: d.slug,
    status: d.status as "draft" | "active" | "archived",
    categoryId: d.categoryId ? String(d.categoryId) : "",
    badges: Array.isArray(d.badges) ? (d.badges as string[]) : [],
    variants: d.variants.map((v) => ({ sku: v.sku, label: v.label, mrp: v.mrpP / 100, price: v.priceP / 100, isActive: v.isActive ?? true })),
  }));
}
export type BulkRow = Awaited<ReturnType<typeof listBulkEdit>>[number];

/** Orders for a combined packing-slip print, in the order asked for. */
export async function getPackingSlips(ids: string[]) {
  if (!ids.length) return [];
  await db();
  const docs = await Order.find({ _id: { $in: ids } }).lean<OrderDoc[]>();
  const byId = new Map(docs.map((d) => [d._id, d]));
  return ids.map((id) => byId.get(id)).filter((d): d is OrderDoc => !!d);
}

// ── Dashboard 2.0 (plan.md §4) ───────────────────────────────────────────────

const IST_TZ = "+05:30";

async function kpis(from: Date, to: Date) {
  const [o, refunds] = await Promise.all([
    Order.aggregate<{ revenueP: number; orders: number; cod: number }>([
      { $match: { status: { $in: REVENUE_STATUSES }, createdAt: { $gte: from, $lt: to } } },
      { $group: { _id: null, revenueP: { $sum: "$pricing.totalP" }, orders: { $sum: 1 }, cod: { $sum: { $cond: [{ $eq: ["$payment.method", "cod"] }, 1, 0] } } } },
    ]),
    Payment.aggregate<{ amountP: number; n: number }>([{ $match: { kind: "refund", createdAt: { $gte: from, $lt: to } } }, { $group: { _id: null, amountP: { $sum: "$amountP" }, n: { $sum: 1 } } }]),
  ]);
  const r = o[0] ?? { revenueP: 0, orders: 0, cod: 0 };
  return { revenueP: r.revenueP, orders: r.orders, aovP: r.orders ? Math.round(r.revenueP / r.orders) : 0, refundsP: refunds[0]?.amountP ?? 0, codShare: r.orders ? r.cod / r.orders : 0 };
}

export async function getDashboard2(from: Date, to: Date) {
  await db();
  const span = to.getTime() - from.getTime();
  const prevFrom = new Date(from.getTime() - span);
  const [now, prev, queues, daily, top, bySign, lowStock, recent] = await Promise.all([
    kpis(from, to),
    kpis(prevFrom, from),
    Promise.all([
      Order.countDocuments({ status: "confirmed" }),
      Order.countDocuments({ status: "processing" }),
      Order.countDocuments({ status: "pending_payment" }),
      ReturnRequest.countDocuments({ status: { $in: ["requested", "approved", "received"] } }),
      Review.countDocuments({ status: "pending" }),
      Product.aggregate<{ n: number }>([{ $match: { status: "active" } }, { $unwind: "$variants" }, { $match: { "variants.isActive": { $ne: false }, $expr: { $lte: ["$variants.stock", { $ifNull: ["$variants.lowStockThreshold", 5] }] } } }, { $count: "n" }]),
    ]),
    Order.aggregate<{ _id: string; grossP: number; orders: number }>([
      { $match: { status: { $in: REVENUE_STATUSES }, createdAt: { $gte: from, $lt: to } } },
      { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: IST_TZ } }, grossP: { $sum: "$pricing.totalP" }, orders: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),
    Order.aggregate<{ _id: { productId: string; name: string }; qty: number; netP: number }>([
      { $match: { status: { $in: REVENUE_STATUSES }, createdAt: { $gte: from, $lt: to } } },
      { $unwind: "$items" },
      { $group: { _id: { productId: "$items.productId", name: "$items.name" }, qty: { $sum: "$items.qty" }, netP: { $sum: { $subtract: ["$items.lineTotalP", "$items.discountP"] } } } },
      { $sort: { netP: -1 } },
      { $limit: 5 },
    ]),
    Order.aggregate<{ _id: ZodiacSlug | null; qty: number; revenueP: number }>([
      { $match: { status: { $in: REVENUE_STATUSES }, createdAt: { $gte: from, $lt: to } } },
      { $unwind: "$items" },
      { $group: { _id: "$items.zodiacSign", qty: { $sum: "$items.qty" }, revenueP: { $sum: { $subtract: ["$items.lineTotalP", "$items.discountP"] } } } },
      { $sort: { revenueP: -1 } },
    ]),
    Product.aggregate<{ name: string; sku: string; label: string; stock: number }>([
      { $match: { status: "active" } },
      { $unwind: "$variants" },
      { $match: { "variants.isActive": { $ne: false }, $expr: { $lte: ["$variants.stock", { $ifNull: ["$variants.lowStockThreshold", 5] }] } } },
      { $project: { _id: 0, name: 1, sku: "$variants.sku", label: "$variants.label", stock: "$variants.stock" } },
      { $sort: { stock: 1 } },
      { $limit: 6 },
    ]),
    Order.find().sort({ createdAt: -1 }).limit(6).select("_id createdAt status contact.name pricing.totalP").lean<OrderDoc[]>(),
  ]);
  const [toPack, toShip, awaitingPayment, claims, reviews, low] = queues;
  return { now, prev, queues: { toPack, toShip, awaitingPayment, claims, reviews, lowStock: low[0]?.n ?? 0 }, daily, top, bySign, lowStock, recent };
}
