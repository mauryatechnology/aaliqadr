import "server-only";
import { Types, type PipelineStage } from "mongoose";
import { db } from "@/server/db/connect";
import { Order, type OrderDoc } from "@/server/models/Order";
import { Product } from "@/server/models/Product";
import { Category, Collection, type CategoryDoc, type CollectionDoc } from "@/server/models/catalog";
import { AuditLog, AuthUser, Coupon, StockMovement, type AuditLogDoc, type CouponDoc, type StockMovementDoc } from "@/server/models/commerce";
import { ReturnRequest, Review, type ReviewDoc } from "@/server/models/engagement";
import { categoryFromDoc, collectionFromDoc, collectionProducts, descendantIds, fromDoc, type LeanProduct } from "@/server/queries/catalog";
import { dateRange, rx, skipOf, type ListState } from "@/lib/list-params";

/**
 * Server-side search, filter, sort and paging for every admin list (plan.md §3). Each list
 * function takes the URL state; `all` lifts the page limit for CSV exports (capped).
 */

const EXPORT_CAP = 20_000;
const REVENUE = ["confirmed", "processing", "shipped", "delivered"];
const OPEN_CLAIM = ["requested", "approved", "received"];
const isId = (s: string) => /^[a-f0-9]{24}$/.test(s);
const dir = (s: ListState) => (s.dir === "asc" ? 1 : -1);
const page = (s: ListState, all: boolean) => (all ? { skip: 0, limit: EXPORT_CAP } : { skip: skipOf(s), limit: s.size });
const yes = (v?: string[]) => v?.[0] === "yes";
const no = (v?: string[]) => v?.[0] === "no";

async function facet<T>(model: { aggregate: (p: PipelineStage[]) => { allowDiskUse: (b: boolean) => Promise<unknown[]> } }, pipeline: PipelineStage[], s: ListState, all: boolean, sort: Record<string, 1 | -1>) {
  const { skip, limit } = page(s, all);
  const [res] = (await model.aggregate([...pipeline, { $facet: { rows: [{ $sort: sort }, { $skip: skip }, { $limit: limit }], total: [{ $count: "n" }] } }]).allowDiskUse(true)) as { rows: T[]; total: { n: number }[] }[];
  return { rows: res?.rows ?? [], total: res?.total[0]?.n ?? 0 };
}

// ── Orders ───────────────────────────────────────────────────────────────────

export function ordersFilter(s: ListState) {
  const f: Record<string, unknown> = {};
  if (s.f.status) f.status = { $in: s.f.status };
  if (s.f.pay) f["payment.method"] = { $in: s.f.pay };
  if (s.f.paid) f["payment.status"] = { $in: s.f.paid };
  if (s.f.state) f["shippingAddress.stateCode"] = { $in: s.f.state };
  if (s.f.sign) f["items.zodiacSign"] = { $in: s.f.sign };
  if (yes(s.f.coupon)) f["pricing.couponCode"] = { $exists: true, $nin: [null, ""] };
  if (no(s.f.coupon)) f["pricing.couponCode"] = { $in: [null, ""] };
  const range = dateRange(s.f);
  if (range) f.createdAt = range;
  if (s.q) {
    const t = s.q.trim();
    f.$or = [{ _id: t.toUpperCase() }, { "contact.email": rx(t) }, { "contact.phone": rx(t) }, { "contact.name": rx(t) }, { "shipment.awb": t }, { "invoice.number": rx(t) }];
  }
  return f;
}

export async function listOrdersPaged(s: ListState, all = false) {
  await db();
  const filter = ordersFilter(s);
  const sortKey = { date: "createdAt", total: "pricing.totalP", status: "status" }[s.sort] ?? "createdAt";
  const { skip, limit } = page(s, all);
  const [rows, total, counts] = await Promise.all([
    Order.find(filter).sort({ [sortKey]: dir(s), _id: -1 }).skip(skip).limit(limit).select("_id createdAt status contact pricing payment items.qty items.name items.sku items.variantLabel shipment.awb shipment.courier shippingAddress.state shippingAddress.city shippingAddress.pincode invoice.number").lean<OrderDoc[]>(),
    Order.countDocuments(filter),
    Order.aggregate<{ _id: string; n: number }>([{ $match: ordersFilter({ ...s, f: { ...s.f, status: [] } }) }, { $group: { _id: "$status", n: { $sum: 1 } } }]),
  ]);
  return { rows, total, statusCounts: Object.fromEntries(counts.map((c) => [c._id, c.n])) as Record<string, number> };
}

// ── Products ─────────────────────────────────────────────────────────────────

export interface ProductListRow {
  id: string;
  name: string;
  slug: string;
  status: string;
  category?: string;
  image?: string;
  sign?: string;
  variants: number;
  minP: number;
  maxP: number;
  stock: number;
  low: boolean;
  badges: string[];
  /** For the inline price editor. */
  prices: { sku: string; label: string; priceP: number; mrpP: number }[];
}

export async function listProductsPaged(s: ListState, all = false) {
  await db();
  const match: Record<string, unknown> = {};
  if (s.f.status) match.status = { $in: s.f.status };
  if (s.f.type) match.type = { $in: s.f.type };
  if (s.f.sign) match.zodiacSign = { $in: s.f.sign };
  if (s.f.badge) match.badges = { $in: s.f.badge };
  if (s.q) {
    const t = s.q.trim();
    match.$or = [{ name: rx(t) }, { slug: rx(t) }, { "variants.sku": rx(t) }, { "variants.barcode": t }, { tags: t.toLowerCase() }];
  }
  const [cats, collection] = await Promise.all([
    Category.find().select("name parentId slug sortOrder isActive").lean<CategoryDoc[]>(),
    s.f.collection?.[0] && isId(s.f.collection[0]) ? Collection.findById(s.f.collection[0]).lean<CollectionDoc>() : null,
  ]);
  const categories = cats.map(categoryFromDoc);
  if (s.f.category?.[0] && isId(s.f.category[0])) match.categoryId = { $in: [...descendantIds(categories, s.f.category[0])].map((id) => new Types.ObjectId(id)) };
  if (collection) {
    // Smart collections are rules over the catalogue, so membership is worked out in memory.
    const docs = await Product.find().lean<LeanProduct[]>();
    const ids = collectionProducts(collectionFromDoc(collection), docs.map(fromDoc), categories).map((p) => new Types.ObjectId(p.id));
    match._id = { $in: ids };
  }
  const pipeline: PipelineStage[] = [
    { $match: match },
    {
      $addFields: {
        _active: { $filter: { input: "$variants", as: "v", cond: { $ne: ["$$v.isActive", false] } } },
      },
    },
    {
      $addFields: {
        minP: { $ifNull: [{ $min: "$_active.priceP" }, 0] },
        maxP: { $ifNull: [{ $max: "$_active.priceP" }, 0] },
        stockSum: { $sum: "$_active.stock" },
        lowCount: { $size: { $filter: { input: "$_active", as: "v", cond: { $lte: ["$$v.stock", { $ifNull: ["$$v.lowStockThreshold", 5] }] } } } },
        inStock: { $size: { $filter: { input: "$_active", as: "v", cond: { $gt: ["$$v.stock", 0] } } } },
        photoCount: { $size: { $filter: { input: { $ifNull: ["$media", []] }, as: "m", cond: { $and: [{ $ne: ["$$m.kind", "video"] }, { $not: [{ $regexMatch: { input: { $ifNull: ["$$m.url", ""] }, regex: "\\.svg$" } }] }] } } } },
      },
    },
  ];
  const after: Record<string, unknown> = {};
  if (s.f.stock?.[0] === "out") after.inStock = 0;
  if (s.f.stock?.[0] === "low") after.lowCount = { $gt: 0 };
  if (yes(s.f.photos)) after.photoCount = { $gt: 0 };
  if (no(s.f.photos)) after.photoCount = 0;
  if (Object.keys(after).length) pipeline.push({ $match: after });
  pipeline.push({ $project: { name: 1, slug: 1, status: 1, categoryId: 1, zodiacSign: 1, badges: 1, media: { $slice: ["$media", 3] }, variantCount: { $size: "$variants" }, prices: { $map: { input: "$variants", as: "v", in: { sku: "$$v.sku", label: "$$v.label", priceP: "$$v.priceP", mrpP: "$$v.mrpP" } } }, minP: 1, maxP: 1, stockSum: 1, lowCount: 1, sortOrder: 1, createdAt: 1, updatedAt: 1, salesCount: 1 } });
  const d = dir(s);
  const sort: Record<string, 1 | -1> =
    s.sort === "name" ? { name: d } : s.sort === "newest" ? { createdAt: d } : s.sort === "updated" ? { updatedAt: d } : s.sort === "bestselling" ? { salesCount: d } : s.sort === "price" ? { minP: d } : s.sort === "stock" ? { stockSum: d } : { sortOrder: d, name: 1 };
  const [{ rows, total }, counts] = await Promise.all([
    facet<{ _id: Types.ObjectId; name: string; slug: string; status: string; categoryId?: Types.ObjectId; zodiacSign?: string; badges?: string[]; media?: { url: string; kind?: string }[]; variantCount: number; prices: ProductListRow["prices"]; minP: number; maxP: number; stockSum: number; lowCount: number }>(Product, pipeline, s, all, { ...sort, _id: 1 }),
    Product.aggregate<{ _id: string; n: number }>([{ $group: { _id: "$status", n: { $sum: 1 } } }]),
  ]);
  const catName = new Map(categories.map((c) => [c.id, c.name]));
  return {
    total,
    statusCounts: Object.fromEntries(counts.map((c) => [c._id, c.n])) as Record<string, number>,
    rows: rows.map(
      (r): ProductListRow => ({
        id: String(r._id),
        name: r.name,
        slug: r.slug,
        status: r.status,
        category: r.categoryId ? catName.get(String(r.categoryId)) : undefined,
        image: r.media?.find((m) => m.kind !== "video")?.url,
        sign: r.zodiacSign ?? undefined,
        variants: r.variantCount,
        minP: r.minP,
        maxP: r.maxP,
        stock: r.stockSum,
        low: r.lowCount > 0,
        badges: r.badges ?? [],
        prices: r.prices ?? [],
      }),
    ),
  };
}

// ── Inventory ────────────────────────────────────────────────────────────────

export interface InventoryRow {
  productId: string;
  name: string;
  status: string;
  sku: string;
  label: string;
  barcode?: string;
  stock: number;
  reserved: number;
  threshold: number;
  isActive: boolean;
}

export async function listInventoryPaged(s: ListState, all = false) {
  await db();
  const match: Record<string, unknown> = {};
  if (s.f.status) match.status = { $in: s.f.status };
  if (s.f.category?.[0] && isId(s.f.category[0])) {
    const cats = (await Category.find().lean<CategoryDoc[]>()).map(categoryFromDoc);
    match.categoryId = { $in: [...descendantIds(cats, s.f.category[0])].map((id) => new Types.ObjectId(id)) };
  }
  const v: Record<string, unknown> = {};
  if (s.f.stock?.[0] === "out") v.stock = { $lte: 0 };
  if (s.f.stock?.[0] === "low") v.$expr = { $lte: ["$stock", "$threshold"] };
  if (s.f.stock?.[0] === "reserved") v.reserved = { $gt: 0 };
  if (yes(s.f.active)) v.isActive = { $ne: false };
  if (no(s.f.active)) v.isActive = false;
  if (s.q) v.$or = [{ name: rx(s.q) }, { sku: rx(s.q) }, { barcode: s.q.trim() }];
  const pipeline: PipelineStage[] = [
    { $match: match },
    { $unwind: "$variants" },
    { $project: { _id: 0, productId: { $toString: "$_id" }, name: 1, status: 1, sku: "$variants.sku", label: "$variants.label", barcode: "$variants.barcode", stock: "$variants.stock", reserved: { $ifNull: ["$variants.reserved", 0] }, threshold: { $ifNull: ["$variants.lowStockThreshold", 5] }, isActive: { $ne: ["$variants.isActive", false] } } },
    { $match: v },
  ];
  const sort: Record<string, 1 | -1> = s.sort === "stock" ? { stock: dir(s), sku: 1 } : s.sort === "reserved" ? { reserved: dir(s), sku: 1 } : { name: dir(s), sku: 1 };
  return facet<InventoryRow>(Product, pipeline, s, all, sort);
}

export async function listLedgerPaged(s: ListState, all = false) {
  await db();
  const f: Record<string, unknown> = {};
  if (s.f.type) f.type = { $in: s.f.type };
  const range = dateRange(s.f);
  if (range) f.createdAt = range;
  if (s.q) f.$or = [{ sku: rx(s.q) }, { reason: rx(s.q) }, { ref: rx(s.q) }, { "actor.name": rx(s.q) }];
  const { skip, limit } = page(s, all);
  const [rows, total] = await Promise.all([StockMovement.find(f).sort({ createdAt: dir(s), _id: -1 }).skip(skip).limit(limit).lean<(StockMovementDoc & { _id: Types.ObjectId })[]>(), StockMovement.countDocuments(f)]);
  return { rows, total };
}

// ── Customers ────────────────────────────────────────────────────────────────

export interface CustomerRow {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  joined?: Date;
  orders: number;
  spentP: number;
  last?: Date;
  openClaims: number;
}

export async function listCustomersPaged(s: ListState, all = false) {
  await db();
  const match: Record<string, unknown> = {};
  if (s.f.role) match.role = { $in: s.f.role.map((r) => (r === "customer" ? null : r)).concat(s.f.role.includes("customer") ? ["customer"] : []) };
  const range = dateRange(s.f);
  if (range) match.createdAt = range;
  if (s.q) match.$or = [{ email: rx(s.q) }, { name: rx(s.q) }, { phone: rx(s.q) }];
  const pipeline: PipelineStage[] = [
    { $match: match },
    { $addFields: { _email: { $toLower: "$email" } } },
    {
      $lookup: {
        from: "orders",
        let: { e: "$_email" },
        pipeline: [{ $match: { $expr: { $eq: ["$contact.email", "$$e"] }, status: { $in: REVENUE } } }, { $group: { _id: null, n: { $sum: 1 }, spentP: { $sum: "$pricing.totalP" }, last: { $max: "$createdAt" } } }],
        as: "_o",
      },
    },
    { $lookup: { from: "returnrequests", let: { e: "$_email" }, pipeline: [{ $match: { $expr: { $eq: ["$email", "$$e"] }, status: { $in: OPEN_CLAIM } } }, { $count: "n" }], as: "_c" } },
    { $addFields: { orders: { $ifNull: [{ $first: "$_o.n" }, 0] }, spentP: { $ifNull: [{ $first: "$_o.spentP" }, 0] }, last: { $first: "$_o.last" }, openClaims: { $ifNull: [{ $first: "$_c.n" }, 0] } } },
  ];
  const after: Record<string, unknown> = {};
  if (yes(s.f.buyer)) after.orders = { $gt: 0 };
  if (no(s.f.buyer)) after.orders = 0;
  if (yes(s.f.claim)) after.openClaims = { $gt: 0 };
  if (Object.keys(after).length) pipeline.push({ $match: after });
  pipeline.push({ $project: { name: 1, email: 1, phone: 1, role: 1, createdAt: 1, orders: 1, spentP: 1, last: 1, openClaims: 1 } });
  const key = { joined: "createdAt", orders: "orders", spent: "spentP", last: "last" }[s.sort] ?? "createdAt";
  const res = await facet<{ _id: unknown; name?: string; email: string; phone?: string; role?: string; createdAt?: Date; orders: number; spentP: number; last?: Date; openClaims: number }>(AuthUser, pipeline, s, all, { [key]: dir(s), _id: 1 });
  return {
    total: res.total,
    rows: res.rows.map((u): CustomerRow => ({ id: String(u._id), name: u.name ?? "", email: u.email, phone: u.phone, role: u.role ?? "customer", joined: u.createdAt, orders: u.orders, spentP: u.spentP, last: u.last, openClaims: u.openClaims })),
  };
}

// ── Returns & claims ─────────────────────────────────────────────────────────

export async function listReturnsPaged(s: ListState, all = false) {
  await db();
  const match: Record<string, unknown> = {};
  if (s.f.status) match.status = { $in: s.f.status };
  if (s.f.reason) match.reason = { $in: s.f.reason };
  if (s.f.resolution) match.resolution = { $in: s.f.resolution };
  const range = dateRange(s.f);
  if (range) match.createdAt = range;
  if (s.q) {
    const t = s.q.trim();
    match.$or = [{ _id: t.toUpperCase() }, { orderId: t.toUpperCase() }, { email: rx(t) }, { name: rx(t) }];
  }
  const pipeline: PipelineStage[] = [{ $match: match }, { $addFields: { valueP: { $sum: { $map: { input: "$items", as: "i", in: { $multiply: ["$$i.qty", "$$i.unitPriceP"] } } } } } }];
  const counts = await ReturnRequest.aggregate<{ _id: string; n: number }>([{ $group: { _id: "$status", n: { $sum: 1 } } }]);
  const res = await facet<{ _id: string; orderId: string; name: string; email: string; reason: string; status: string; resolution?: string; refundP: number; valueP: number; items: { name: string; variantLabel: string; qty: number }[]; createdAt: Date }>(ReturnRequest, pipeline, s, all, { [s.sort === "value" ? "valueP" : "createdAt"]: dir(s), _id: -1 });
  return { ...res, statusCounts: Object.fromEntries(counts.map((c) => [c._id, c.n])) as Record<string, number> };
}

// ── Reviews ──────────────────────────────────────────────────────────────────

export async function listReviewsPaged(s: ListState, all = false) {
  await db();
  const f: Record<string, unknown> = {};
  if (s.f.status) f.status = { $in: s.f.status };
  if (s.f.rating) f.rating = { $in: s.f.rating.map(Number).filter((n) => n >= 1 && n <= 5) };
  if (yes(s.f.verified)) f.verified = true;
  if (no(s.f.verified)) f.verified = false;
  if (yes(s.f.photos)) f["photos.0"] = { $exists: true };
  if (no(s.f.photos)) f["photos.0"] = { $exists: false };
  if (s.q) f.$or = [{ title: rx(s.q) }, { body: rx(s.q) }, { productName: rx(s.q) }, { name: rx(s.q) }, { email: rx(s.q) }];
  const { skip, limit } = page(s, all);
  const [rows, total, counts] = await Promise.all([
    Review.find(f).select("+email").sort({ [s.sort === "rating" ? "rating" : "createdAt"]: dir(s), _id: -1 }).skip(skip).limit(limit).lean<ReviewDoc[]>(),
    Review.countDocuments(f),
    Review.aggregate<{ _id: string; n: number }>([{ $group: { _id: "$status", n: { $sum: 1 } } }]),
  ]);
  return {
    total,
    statusCounts: Object.fromEntries(counts.map((c) => [c._id, c.n])) as Record<string, number>,
    rows: rows.map((r) => ({ id: String(r._id), productName: r.productName, productSlug: r.productSlug, name: r.name, email: r.email, rating: r.rating, title: r.title, body: r.body, photos: r.photos, verified: r.verified, status: r.status, reply: r.reply?.body ?? "", createdAt: r.createdAt.toISOString() })),
  };
}

// ── Coupons ──────────────────────────────────────────────────────────────────

export async function listCouponsPaged(s: ListState, all = false) {
  await db();
  const now = new Date();
  const f: Record<string, unknown> = {};
  const state = s.f.state?.[0];
  if (state === "live") Object.assign(f, { isActive: true, startsAt: { $lte: now }, endsAt: { $gte: now } });
  if (state === "scheduled") Object.assign(f, { isActive: true, startsAt: { $gt: now } });
  if (state === "ended") f.endsAt = { $lt: now };
  if (state === "paused") f.isActive = false;
  if (s.f.kind) f.kind = { $in: s.f.kind };
  if (s.q) f.$or = [{ code: rx(s.q) }, { description: rx(s.q) }];
  const key = { created: "createdAt", ends: "endsAt", uses: "usedCount" }[s.sort] ?? "createdAt";
  const { skip, limit } = page(s, all);
  const [rows, total] = await Promise.all([Coupon.find(f).sort({ [key]: dir(s), code: 1 }).skip(skip).limit(limit).lean<(CouponDoc & { _id: Types.ObjectId })[]>(), Coupon.countDocuments(f)]);
  return { rows, total };
}

// ── Invoices ─────────────────────────────────────────────────────────────────

export async function listInvoicesPaged(s: ListState, all = false) {
  await db();
  const f: Record<string, unknown> = { "invoice.number": { $exists: true } };
  if (s.f.fy?.[0] && /^\d{4}-\d{2}$/.test(s.f.fy[0])) f["invoice.number"] = { $regex: `^INV/${s.f.fy[0]}/` };
  const range = dateRange(s.f);
  if (range) f["invoice.issuedAt"] = range;
  if (s.f.supply?.[0] === "inter") f["placeOfSupply.isInterState"] = true;
  if (s.f.supply?.[0] === "intra") f["placeOfSupply.isInterState"] = false;
  if (s.f.state) f["shippingAddress.stateCode"] = { $in: s.f.state };
  if (s.q) {
    const t = s.q.trim();
    f.$or = [{ _id: t.toUpperCase() }, { "invoice.number": rx(t) }, { "contact.email": rx(t) }, { "contact.name": rx(t) }];
  }
  const { skip, limit } = page(s, all);
  const [rows, total, years] = await Promise.all([
    Order.find(f).sort({ [s.sort === "total" ? "pricing.totalP" : "invoice.issuedAt"]: dir(s), _id: -1 }).skip(skip).limit(limit).select("_id invoice contact.name contact.email pricing status placeOfSupply shippingAddress.state shippingAddress.stateCode").lean<OrderDoc[]>(),
    Order.countDocuments(f),
    Order.aggregate<{ _id: string }>([{ $match: { "invoice.issuedAt": { $exists: true } } }, { $group: { _id: { $arrayElemAt: [{ $split: ["$invoice.number", "/"] }, 1] } } }, { $sort: { _id: -1 } }]),
  ]);
  return { rows, total, years: years.map((y) => y._id).filter(Boolean) };
}

// ── Activity log ─────────────────────────────────────────────────────────────

export async function listAuditPaged(s: ListState, all = false) {
  await db();
  const f: Record<string, unknown> = {};
  if (s.f.kind) f["entity.kind"] = { $in: s.f.kind };
  if (s.f.role) f["actor.role"] = { $in: s.f.role };
  const range = dateRange(s.f);
  if (range) f.createdAt = range;
  if (s.q) f.$or = [{ action: rx(s.q) }, { "entity.id": rx(s.q) }, { "actor.name": rx(s.q) }];
  const { skip, limit } = page(s, all);
  const [rows, total, kinds] = await Promise.all([
    AuditLog.find(f).sort({ createdAt: dir(s), _id: -1 }).skip(skip).limit(limit).lean<(AuditLogDoc & { _id: Types.ObjectId })[]>(),
    AuditLog.countDocuments(f),
    AuditLog.distinct("entity.kind"),
  ]);
  return { rows, total, kinds: (kinds as string[]).sort() };
}
