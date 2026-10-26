import "server-only";
import { Types } from "mongoose";
import { db } from "@/server/db/connect";
import { Order, type OrderDoc } from "@/server/models/Order";
import { Product } from "@/server/models/Product";
import { Category } from "@/server/models/catalog";
import { Address, AuthUser, Payment, type AddressDoc, type AuthUserDoc } from "@/server/models/commerce";
import { Content, PolicyVersion, Question, ReturnRequest, Review, SearchLog, StaffInvite, type QuestionDoc, type ContentDoc, type ReturnDoc, type ReviewDoc, type StaffInviteDoc } from "@/server/models/engagement";
import { financialYear } from "@/server/services/ids";

/** Admin reads for returns, reviews, customers, staff, content, invoices and reports (docs/11). */

const REVENUE = ["confirmed", "processing", "shipped", "delivered"];
const esc = (s: string) => s.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&").slice(0, 60);
export const OPS_PAGE = 25;

export async function getAdminBadges() {
  await db();
  const [toShip, returns, reviews, questions] = await Promise.all([
    Order.countDocuments({ status: { $in: ["confirmed", "processing"] } }),
    ReturnRequest.countDocuments({ status: { $in: ["requested", "approved", "received"] } }),
    Review.countDocuments({ status: "pending" }),
    Question.countDocuments({ status: "pending" }),
  ]);
  return { toShip, returns, reviews, questions };
}

// ── Reviews ─────────────────────────────────────────────────────────────────

// ── Returns ─────────────────────────────────────────────────────────────────

export async function getReturnAdmin(id: string) {
  if (!/^RT-\d{6,}$/.test(id)) return null;
  await db();
  const r = await ReturnRequest.findById(id).lean<ReturnDoc>();
  if (!r) return null;
  const order = await Order.findById(r.orderId).select("_id createdAt status pricing payment contact shippingAddress items shipment").lean<OrderDoc>();
  return { r, order };
}

// ── Customers ───────────────────────────────────────────────────────────────

export async function getCustomerAdmin(id: string) {
  if (!/^[a-f0-9]{24}$/.test(id)) return null;
  await db();
  const u = await AuthUser.findById(new Types.ObjectId(id)).lean<AuthUserDoc & { createdAt?: Date }>();
  if (!u) return null;
  const email = u.email.toLowerCase();
  const match = { $or: [{ userId: id }, { "contact.email": email }] };
  const [orders, addresses, reviews, returns, stats] = await Promise.all([
    Order.find(match).sort({ createdAt: -1 }).limit(50).select("_id createdAt status pricing.totalP payment.method payment.status items.qty").lean<OrderDoc[]>(),
    Address.find({ userId: id }).lean<AddressDoc[]>(),
    Review.find({ userId: id }).sort({ createdAt: -1 }).limit(20).lean<ReviewDoc[]>(),
    ReturnRequest.find({ email }).sort({ createdAt: -1 }).limit(20).lean<ReturnDoc[]>(),
    Order.aggregate<{ spentP: number; n: number; first: Date; last: Date }>([
      { $match: { ...match, status: { $in: REVENUE } } },
      { $group: { _id: null, spentP: { $sum: "$pricing.totalP" }, n: { $sum: 1 }, first: { $min: "$createdAt" }, last: { $max: "$createdAt" } } },
    ]),
  ]);
  const s = stats[0];
  const flags = u as { disabled?: boolean; codBlocked?: boolean };
  return { user: { id, name: u.name ?? "", email: u.email, role: u.role ?? "customer", phone: (u as { phone?: string }).phone, joined: u.createdAt, disabled: !!flags.disabled, codBlocked: !!flags.codBlocked }, orders, addresses, reviews, returns, ltv: { spentP: s?.spentP ?? 0, orders: s?.n ?? 0, aovP: s?.n ? Math.round(s.spentP / s.n) : 0, first: s?.first, last: s?.last } };
}

// ── Staff ───────────────────────────────────────────────────────────────────

export async function listStaff() {
  await db();
  const [users, invites] = await Promise.all([
    AuthUser.find({ role: { $in: ["staff", "admin", "owner"] } }).sort({ role: 1, name: 1 }).lean<(AuthUserDoc & { createdAt?: Date })[]>(),
    StaffInvite.find().sort({ createdAt: -1 }).lean<StaffInviteDoc[]>(),
  ]);
  return {
    users: users.map((u) => ({ id: String(u._id), name: u.name ?? "", email: u.email, role: u.role ?? "staff", joined: u.createdAt })),
    invites: invites.map((i) => ({ id: String(i._id), email: i.email, role: i.role, invitedBy: i.invitedBy?.name ?? "", acceptedAt: i.acceptedAt, createdAt: i.createdAt })),
  };
}

// ── Content ─────────────────────────────────────────────────────────────────

export async function getContentAdmin() {
  await db();
  const [doc, versions] = await Promise.all([
    Content.findById("storefront").lean<ContentDoc>(),
    PolicyVersion.aggregate<{ _id: string; versions: { version: number; at: Date; by: string }[] }>([
      { $sort: { version: -1 } },
      { $group: { _id: "$key", versions: { $push: { version: "$version", at: "$createdAt", by: "$publishedBy.name" } } } },
    ]),
  ]);
  return {
    content: JSON.parse(JSON.stringify({ announcement: doc?.announcement ?? { text: "", active: false }, banners: doc?.banners ?? [], faqs: doc?.faqs ?? [], search: { popular: doc?.search?.popular ?? [], synonyms: doc?.search?.synonyms ?? [] }, policies: doc?.policies ?? {} })) as Pick<ContentDoc, "announcement" | "banners" | "faqs" | "policies"> & { search: { popular: string[]; synonyms: string[][] } },
    history: Object.fromEntries(versions.map((v) => [v._id, v.versions.slice(0, 10)])) as Record<string, { version: number; at: Date; by: string }[]>,
  };
}

// ── Invoices ────────────────────────────────────────────────────────────────

export async function listInvoices(q: string, fy: string, page: number) {
  await db();
  const filter: Record<string, unknown> = { "invoice.number": { $exists: true } };
  if (fy) filter["invoice.number"] = { $regex: `^INV/${esc(fy)}/` };
  if (q.trim()) filter.$or = [{ _id: q.trim().toUpperCase() }, { "invoice.number": { $regex: esc(q), $options: "i" } }, { "contact.email": { $regex: esc(q), $options: "i" } }, { "contact.name": { $regex: esc(q), $options: "i" } }];
  const [rows, total, years] = await Promise.all([
    Order.find(filter).sort({ "invoice.issuedAt": -1 }).skip((page - 1) * OPS_PAGE).limit(OPS_PAGE).select("_id invoice contact.name contact.email pricing status placeOfSupply shippingAddress.state").lean<OrderDoc[]>(),
    Order.countDocuments(filter),
    Order.aggregate<{ _id: string }>([{ $match: { "invoice.issuedAt": { $exists: true } } }, { $group: { _id: { $arrayElemAt: [{ $split: ["$invoice.number", "/"] }, 1] } } }, { $sort: { _id: -1 } }]),
  ]);
  return { rows, total, years: years.map((y) => y._id).filter(Boolean), current: financialYear(new Date()) };
}

// ── Reports ─────────────────────────────────────────────────────────────────

/** IST day key for grouping. */
const IST = "+05:30";

export async function salesReport(from: Date, to: Date) {
  await db();
  const match = { status: { $in: REVENUE }, "invoice.issuedAt": { $gte: from, $lt: to } };
  const [daily, totals, byProduct, byState, gst, byCategoryRaw, refunds, cats] = await Promise.all([
    Order.aggregate<{ _id: string; orders: number; grossP: number; taxP: number }>([
      { $match: match },
      { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$invoice.issuedAt", timezone: IST } }, orders: { $sum: 1 }, grossP: { $sum: "$pricing.totalP" }, taxP: { $sum: { $add: ["$pricing.cgstP", "$pricing.sgstP", "$pricing.igstP"] } } } },
      { $sort: { _id: 1 } },
    ]),
    Order.aggregate<{ orders: number; grossP: number; discountP: number; shippingP: number; taxableP: number; cgstP: number; sgstP: number; igstP: number; units: number }>([
      { $match: match },
      { $group: { _id: null, orders: { $sum: 1 }, grossP: { $sum: "$pricing.totalP" }, discountP: { $sum: "$pricing.discountP" }, shippingP: { $sum: "$pricing.shippingP" }, taxableP: { $sum: "$pricing.taxableP" }, cgstP: { $sum: "$pricing.cgstP" }, sgstP: { $sum: "$pricing.sgstP" }, igstP: { $sum: "$pricing.igstP" }, units: { $sum: { $sum: "$items.qty" } } } },
    ]),
    Order.aggregate<{ _id: { sku: string; name: string; label: string }; qty: number; netP: number; productId: string }>([
      { $match: match },
      { $unwind: "$items" },
      { $group: { _id: { sku: "$items.sku", name: "$items.name", label: "$items.variantLabel" }, productId: { $first: "$items.productId" }, qty: { $sum: "$items.qty" }, netP: { $sum: { $subtract: ["$items.lineTotalP", "$items.discountP"] } } } },
      { $sort: { netP: -1 } },
    ]),
    Order.aggregate<{ _id: string; orders: number; grossP: number; taxableP: number; cgstP: number; sgstP: number; igstP: number }>([
      { $match: match },
      { $group: { _id: "$shippingAddress.state", orders: { $sum: 1 }, grossP: { $sum: "$pricing.totalP" }, taxableP: { $sum: "$pricing.taxableP" }, cgstP: { $sum: "$pricing.cgstP" }, sgstP: { $sum: "$pricing.sgstP" }, igstP: { $sum: "$pricing.igstP" } } },
      { $sort: { grossP: -1 } },
    ]),
    // HSN summary (GSTR-1 table 12): goods lines, value incl. GST, split back out per rate.
    Order.aggregate<{ _id: { hsn: string; rate: number }; qty: number; valueP: number; inter: number }>([
      { $match: match },
      { $unwind: "$items" },
      {
        $group: {
          _id: { hsn: "$items.hsnCode", rate: "$items.gstRateBps" },
          qty: { $sum: "$items.qty" },
          valueP: { $sum: { $subtract: ["$items.lineTotalP", "$items.discountP"] } },
          inter: { $sum: { $cond: ["$placeOfSupply.isInterState", { $subtract: ["$items.lineTotalP", "$items.discountP"] }, 0] } },
        },
      },
      { $sort: { "_id.hsn": 1 } },
    ]),
    Order.aggregate<{ _id: string; qty: number; netP: number }>([
      { $match: match },
      { $unwind: "$items" },
      { $group: { _id: "$items.productId", qty: { $sum: "$items.qty" }, netP: { $sum: { $subtract: ["$items.lineTotalP", "$items.discountP"] } } } },
    ]),
    Payment.aggregate<{ n: number; amountP: number }>([{ $match: { kind: "refund", createdAt: { $gte: from, $lt: to } } }, { $group: { _id: null, n: { $sum: 1 }, amountP: { $sum: "$amountP" } } }]),
    Category.find().select("name").lean(),
  ]);

  // Category = the product's current category (orders don't snapshot it).
  const ids = byCategoryRaw.map((r) => r._id).filter((x) => Types.ObjectId.isValid(x));
  const products = await Product.find({ _id: { $in: ids } }).select("categoryId").lean();
  const catOf = new Map(products.map((p) => [String(p._id), p.categoryId ? String(p.categoryId) : ""]));
  const catName = new Map(cats.map((c) => [String(c._id), c.name]));
  const byCategory = new Map<string, { qty: number; netP: number }>();
  for (const r of byCategoryRaw) {
    const name = catName.get(catOf.get(r._id) ?? "") ?? "Uncategorised";
    const cur = byCategory.get(name) ?? { qty: 0, netP: 0 };
    byCategory.set(name, { qty: cur.qty + r.qty, netP: cur.netP + r.netP });
  }

  const hsn = gst.map((g) => {
    const taxable = Math.round((g.valueP * 10000) / (10000 + g._id.rate));
    const tax = g.valueP - taxable;
    const interTaxable = Math.round((g.inter * 10000) / (10000 + g._id.rate));
    const igst = g.inter - interTaxable;
    return { hsn: g._id.hsn, ratePercent: g._id.rate / 100, qty: g.qty, valueP: g.valueP, taxableP: taxable, igstP: igst, cgstP: Math.round((tax - igst) / 2), sgstP: tax - igst - Math.round((tax - igst) / 2) };
  });

  return {
    totals: totals[0] ?? { orders: 0, grossP: 0, discountP: 0, shippingP: 0, taxableP: 0, cgstP: 0, sgstP: 0, igstP: 0, units: 0 },
    refunds: refunds[0] ?? { n: 0, amountP: 0 },
    daily,
    byProduct: byProduct.map((p) => ({ sku: p._id.sku, name: p._id.name, label: p._id.label, qty: p.qty, netP: p.netP })),
    byCategory: [...byCategory.entries()].map(([name, v]) => ({ name, ...v })).sort((a, b) => b.netP - a.netP),
    byState: byState.map((s) => ({ state: s._id, ...s })),
    hsn,
  };
}

// ── Activity log ────────────────────────────────────────────────────────────


// ── Search analytics (plan.md §9.2) ─────────────────────────────────────────

export async function searchReport(from: Date, to: Date) {
  await db();
  const match = { createdAt: { $gte: from, $lt: to } };
  const [top, zero, totals] = await Promise.all([
    SearchLog.aggregate<{ _id: string; n: number; avgResults: number }>([{ $match: { ...match, event: "search" } }, { $group: { _id: "$q", n: { $sum: 1 }, avgResults: { $avg: "$results" } } }, { $sort: { n: -1 } }, { $limit: 15 }]),
    SearchLog.aggregate<{ _id: string; n: number }>([{ $match: { ...match, event: "search", results: 0 } }, { $group: { _id: "$q", n: { $sum: 1 } } }, { $sort: { n: -1 } }, { $limit: 15 }]),
    SearchLog.aggregate<{ _id: string; n: number }>([{ $match: match }, { $group: { _id: "$event", n: { $sum: 1 } } }]),
  ]);
  const count = Object.fromEntries(totals.map((t) => [t._id, t.n])) as Record<string, number>;
  return { top, zero, searches: count.search ?? 0, clicks: count.click ?? 0, adds: count.add ?? 0 };
}

// ── Product questions ───────────────────────────────────────────────────────

export async function listQuestionsAdmin(status: "pending" | "answered" | "hidden", page: number) {
  await db();
  const [rows, total, counts] = await Promise.all([
    Question.find({ status }).select("+email").sort({ createdAt: -1 }).skip((page - 1) * OPS_PAGE).limit(OPS_PAGE).lean<QuestionDoc[]>(),
    Question.countDocuments({ status }),
    Question.aggregate<{ _id: string; n: number }>([{ $group: { _id: "$status", n: { $sum: 1 } } }]),
  ]);
  return {
    total,
    counts: Object.fromEntries(counts.map((c) => [c._id, c.n])) as Record<string, number>,
    rows: rows.map((q) => ({ id: String(q._id), productName: q.productName, productSlug: q.productSlug, question: q.question, name: q.name, email: q.email, status: q.status, answer: q.answer?.body ?? "", at: q.createdAt.toISOString() })),
  };
}
