"use server";

import { revalidatePath, updateTag } from "next/cache";
import { z } from "zod";
import { csvRecords } from "@/lib/csv";
import { rupeesToPaise } from "@/lib/money";
import { SKU_RE } from "@/lib/sku";
import { requireRole, ROLES } from "@/server/auth";
import { db } from "@/server/db/connect";
import { ObjectId } from "mongodb";
import { AuditLog, Coupon, CouponRedemption } from "@/server/models/commerce";
import { couponOfferTag } from "@/server/queries/offers";
import { Product } from "@/server/models/Product";
import { adjust } from "@/server/services/inventory";
import { revalidateProducts } from "@/server/services/products";
import { str, toFormError, type FormState } from "./shared";

/** Inventory, customers, coupons and settings actions (docs/11 §3.4–3.10). */

const fieldErrors = (e: z.ZodError) => z.flattenError(e).fieldErrors as Record<string, string[]>;

export async function adjustStockAction(_prev: FormState, fd: FormData): Promise<FormState> {
  try {
    const user = await requireRole("admin");
    const parsed = z
      .object({
        productId: z.string().regex(/^[a-f0-9]{24}$/),
        sku: z.string().regex(SKU_RE),
        delta: z.coerce.number().int().min(-10000).max(10000).refine((n) => n !== 0, "Enter a number other than 0"),
        reason: z.string().trim().min(3, "Say why (e.g. New batch B-102, damaged in storage)").max(200),
      })
      .safeParse({ productId: str(fd, "productId"), sku: str(fd, "sku"), delta: str(fd, "delta"), reason: str(fd, "reason") });
    if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the form.", fieldErrors: fieldErrors(parsed.error) };
    const v = parsed.data;
    await db();
    await adjust({ productId: v.productId, sku: v.sku, qty: Math.abs(v.delta), delta: v.delta }, v.reason, { name: user.name, role: user.role, userId: user.id });
    const p = await Product.findById(v.productId).select("slug").lean();
    if (p) revalidateProducts([p.slug]);
    revalidatePath("/admin/inventory");
    return { ok: true, message: `${v.sku}: ${v.delta > 0 ? "+" : ""}${v.delta} recorded.` };
  } catch (e) {
    return toFormError(e, "adjust_stock");
  }
}

/** Inline "low stock at" edit from Inventory (plan.md §4). Returns the previous value for Undo. */
export async function setLowStockThresholdAction(productId: string, sku: string, threshold: number): Promise<FormState & { previous?: number }> {
  try {
    const user = await requireRole("admin");
    const v = z.object({ productId: z.string().regex(/^[a-f0-9]{24}$/), sku: z.string().regex(SKU_RE), threshold: z.number().int().min(0).max(1000) }).parse({ productId, sku, threshold });
    await db();
    const p = await Product.findOne({ _id: v.productId, "variants.sku": v.sku }).select("slug variants.sku variants.lowStockThreshold").lean();
    if (!p) return { error: "Variant not found." };
    const previous = p.variants.find((x) => x.sku === v.sku)?.lowStockThreshold ?? 5;
    await Product.updateOne({ _id: v.productId, "variants.sku": v.sku }, { $set: { "variants.$.lowStockThreshold": v.threshold } });
    await AuditLog.create({ actor: { userId: user.id, name: user.name, role: user.role }, action: "inventory.threshold", entity: { kind: "product", id: v.productId }, detail: { sku: v.sku, from: previous, to: v.threshold } });
    revalidateProducts([p.slug]);
    revalidatePath("/admin/inventory");
    return { ok: true, message: `${v.sku}: low-stock alert at ${v.threshold}.`, previous };
  } catch (e) {
    return toFormError(e, "set_threshold");
  }
}

export async function setRoleAction(_prev: FormState, fd: FormData): Promise<FormState> {
  try {
    const user = await requireRole("owner");
    const parsed = z.object({ userId: z.string().regex(/^[a-f0-9]{24}$/), role: z.enum(ROLES) }).safeParse({ userId: str(fd, "userId"), role: str(fd, "role") });
    if (!parsed.success) return { error: "Choose a role." };
    if (parsed.data.userId === user.id) return { error: "You can't change your own role." };
    if (parsed.data.role === "owner" && str(fd, "confirm") !== "OWNER") return { error: "Type OWNER to confirm giving full ownership." };
    const conn = await db();
    // Better Auth owns these collections; it stores ids as ObjectIds.
    const users = conn.connection.db!.collection<{ _id: ObjectId; email: string; role?: string }>("user");
    const _id = new ObjectId(parsed.data.userId);
    const target = await users.findOne({ _id });
    if (!target) return { error: "User not found." };
    await users.updateOne({ _id }, { $set: { role: parsed.data.role } });
    // End their sessions so the new role takes effect immediately (docs/06 §2).
    await conn.connection.db!.collection("session").deleteMany({ userId: { $in: [_id, parsed.data.userId] } });
    await AuditLog.create({ actor: { userId: user.id, name: user.name, role: user.role }, action: "user.role", entity: { kind: "user", id: parsed.data.userId }, detail: { from: target.role ?? "customer", to: parsed.data.role } });
    revalidatePath("/admin/customers");
    return { ok: true, message: `${target.email} is now ${parsed.data.role}.` };
  } catch (e) {
    return toFormError(e, "set_role");
  }
}

/** Owner: takes away someone's staff access (role → customer) and signs them out (plan.md §5). */
export async function removeStaffAccessAction(userId: string): Promise<FormState> {
  const fd = new FormData();
  fd.set("userId", userId);
  fd.set("role", "customer");
  const res = await setRoleAction({}, fd);
  return res.ok ? { ok: true, message: "Access removed. They've been signed out." } : res;
}

/** Owner: signs a person out on every device without changing their role (plan.md §6 item 10). */
export async function endUserSessionsAction(userId: string): Promise<FormState> {
  try {
    const user = await requireRole("owner");
    const id = z.string().regex(/^[a-f0-9]{24}$/).parse(userId);
    if (id === user.id) return { error: "Use Account › Security to sign out your own other devices." };
    const conn = await db();
    const res = await conn.connection.db!.collection("session").deleteMany({ userId: { $in: [new ObjectId(id), id] } });
    await AuditLog.create({ actor: { userId: user.id, name: user.name, role: user.role }, action: "user.sessions_ended", entity: { kind: "user", id }, detail: { sessions: res.deletedCount } });
    return { ok: true, message: res.deletedCount ? `Signed out of ${res.deletedCount} session${res.deletedCount === 1 ? "" : "s"}.` : "They had no active sessions." };
  } catch (e) {
    return toFormError(e, "end_sessions");
  }
}

const couponSchema = z
  .object({
    code: z.string().trim().toUpperCase().regex(/^[A-Z0-9]{4,20}$/, "4–20 letters or numbers"),
    description: z.string().trim().max(120),
    kind: z.enum(["percent", "flat", "free_shipping"]),
    value: z.coerce.number().min(0).max(100000),
    maxDiscount: z.coerce.number().min(0).max(100000),
    minSubtotal: z.coerce.number().min(0).max(1000000),
    // Dates are India calendar days: a coupon runs from 00:00 IST on its start day to 23:59 IST
    // on its end day (plan.md B2).
    startsAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a start date").transform((d) => new Date(`${d}T00:00:00+05:30`)),
    endsAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose an end date").transform((d) => new Date(`${d}T23:59:59.999+05:30`)),
    usageLimit: z.coerce.number().int().min(0).max(1000000),
    perCustomerLimit: z.coerce.number().int().min(0).max(100),
    showOnProduct: z.preprocess((v) => v === "on" || v === "true" || v === true, z.boolean()),
  })
  .refine((c) => c.endsAt > c.startsAt, { message: "End date can't be before the start", path: ["endsAt"] })
  .refine((c) => c.kind !== "percent" || (c.value > 0 && c.value <= 90), { message: "Percent must be between 1 and 90", path: ["value"] })
  .refine((c) => c.kind !== "flat" || c.value > 0, { message: "Enter the discount amount", path: ["value"] });

export async function createCouponAction(_prev: FormState, fd: FormData): Promise<FormState> {
  try {
    const user = await requireRole("admin");
    const keys = ["code", "description", "kind", "value", "maxDiscount", "minSubtotal", "startsAt", "endsAt", "usageLimit", "perCustomerLimit", "showOnProduct"];
    const parsed = couponSchema.safeParse(Object.fromEntries(keys.map((k) => [k, str(fd, k)])));
    if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the form.", fieldErrors: fieldErrors(parsed.error) };
    const c = parsed.data;
    await db();
    await Coupon.create({
      code: c.code,
      description: c.description,
      kind: c.kind,
      valueBps: c.kind === "percent" ? Math.round(c.value * 100) : 0,
      valueP: c.kind === "flat" ? rupeesToPaise(c.value) : 0,
      maxDiscountP: rupeesToPaise(c.maxDiscount),
      minSubtotalP: rupeesToPaise(c.minSubtotal),
      startsAt: c.startsAt,
      endsAt: c.endsAt,
      usageLimit: c.usageLimit,
      perCustomerLimit: c.perCustomerLimit,
      showOnProduct: c.showOnProduct,
      isActive: true,
    });
    updateTag(couponOfferTag);
    await AuditLog.create({ actor: { userId: user.id, name: user.name, role: user.role }, action: "coupon.create", entity: { kind: "coupon", id: c.code } });
    revalidatePath("/admin/coupons");
    return { ok: true, message: `Coupon ${c.code} is live.` };
  } catch (e) {
    return toFormError(e, "create_coupon");
  }
}

/**
 * Edits a coupon (plan.md §5). Once used, its code, type and value are fixed (orders refer to
 * them); the description, dates, limits and visibility can still change.
 */
export async function updateCouponAction(_prev: FormState, fd: FormData): Promise<FormState> {
  try {
    const user = await requireRole("admin");
    const keys = ["code", "description", "kind", "value", "maxDiscount", "minSubtotal", "startsAt", "endsAt", "usageLimit", "perCustomerLimit", "showOnProduct"];
    const parsed = couponSchema.safeParse(Object.fromEntries(keys.map((k) => [k, str(fd, k)])));
    if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the form.", fieldErrors: fieldErrors(parsed.error) };
    const c = parsed.data;
    await db();
    const existing = await Coupon.findOne({ code: c.code }).lean();
    if (!existing) return { error: "Coupon not found." };
    const used = existing.usedCount > 0 || !!(await CouponRedemption.exists({ code: c.code }));
    const set: Record<string, unknown> = {
      description: c.description,
      startsAt: c.startsAt,
      endsAt: c.endsAt,
      usageLimit: c.usageLimit,
      perCustomerLimit: c.perCustomerLimit,
      showOnProduct: c.showOnProduct,
      minSubtotalP: rupeesToPaise(c.minSubtotal),
      maxDiscountP: rupeesToPaise(c.maxDiscount),
    };
    if (!used) Object.assign(set, { kind: c.kind, valueBps: c.kind === "percent" ? Math.round(c.value * 100) : 0, valueP: c.kind === "flat" ? rupeesToPaise(c.value) : 0 });
    else if (c.kind !== existing.kind || (c.kind === "percent" ? Math.round(c.value * 100) !== existing.valueBps : c.kind === "flat" ? rupeesToPaise(c.value) !== existing.valueP : false)) return { error: "This coupon has been used, so its type and value can't change. Create a new code instead." };
    await Coupon.updateOne({ code: c.code }, { $set: set });
    await AuditLog.create({ actor: { userId: user.id, name: user.name, role: user.role }, action: "coupon.update", entity: { kind: "coupon", id: c.code }, detail: { before: { description: existing.description, startsAt: existing.startsAt, endsAt: existing.endsAt, usageLimit: existing.usageLimit } } });
    updateTag(couponOfferTag);
    revalidatePath("/admin/coupons");
    return { ok: true, message: `${c.code} updated.` };
  } catch (e) {
    return toFormError(e, "update_coupon");
  }
}

/** Deletes a coupon that was never used; a used one can only be paused. */
export async function deleteCouponAction(code: string): Promise<FormState> {
  try {
    const user = await requireRole("admin");
    const c = z.string().trim().toUpperCase().regex(/^[A-Z0-9]{4,20}$/).parse(code);
    await db();
    const existing = await Coupon.findOne({ code: c }).lean();
    if (!existing) return { error: "Coupon not found." };
    if (existing.usedCount > 0 || (await CouponRedemption.exists({ code: c }))) return { error: "This coupon has been used, so it's kept for the records. Pause it instead." };
    await Coupon.deleteOne({ code: c });
    await AuditLog.create({ actor: { userId: user.id, name: user.name, role: user.role }, action: "coupon.delete", entity: { kind: "coupon", id: c } });
    updateTag(couponOfferTag);
    revalidatePath("/admin/coupons");
    return { ok: true, message: `${c} deleted.` };
  } catch (e) {
    return toFormError(e, "delete_coupon");
  }
}

/** Orders that used a coupon, newest first. */
export async function couponUsageAction(code: string) {
  await requireRole("admin");
  const c = z.string().trim().toUpperCase().regex(/^[A-Z0-9]{4,20}$/).parse(code);
  await db();
  const rows = await CouponRedemption.find({ code: c }).sort({ createdAt: -1 }).limit(200).lean();
  return rows.map((r) => ({ orderId: r.orderId, email: r.email, discountP: r.discountP, status: r.status, at: r.createdAt ? new Date(r.createdAt).toISOString() : "" }));
}

export async function toggleCouponAction(_prev: FormState, fd: FormData): Promise<FormState> {
  try {
    const user = await requireRole("admin");
    const code = str(fd, "code").toUpperCase();
    const active = str(fd, "active") === "true";
    await db();
    await Coupon.updateOne({ code }, { $set: { isActive: active } });
    updateTag(couponOfferTag);
    await AuditLog.create({ actor: { userId: user.id, name: user.name, role: user.role }, action: active ? "coupon.enable" : "coupon.disable", entity: { kind: "coupon", id: code } });
    revalidatePath("/admin/coupons");
    return { ok: true, message: `${code} ${active ? "enabled" : "paused"}.` };
  } catch (e) {
    return toFormError(e, "toggle_coupon");
  }
}

export interface StockImportReport {
  error?: string;
  applied: boolean;
  changes: { sku: string; from: number; to: number; delta: number }[];
  problems: string[];
}

/**
 * Stock from a spreadsheet: either a counted `count` (stocktake) or a `delta`, per SKU, with a
 * reason. Preview first (`apply: false`); every applied change goes through the ledger.
 */
export async function importStockCsvAction(text: string, reason: string, apply: boolean): Promise<StockImportReport> {
  const report: StockImportReport = { applied: false, changes: [], problems: [] };
  try {
    const user = await requireRole("admin");
    const why = reason.trim();
    if (why.length < 3) return { ...report, error: "Give a reason (e.g. Stocktake 31 Oct)." };
    const rows = csvRecords(text);
    if (!rows.length) return { ...report, error: "The file has no rows." };
    if (!("sku" in rows[0]!) || !("count" in rows[0]! || "delta" in rows[0]!)) return { ...report, error: "Columns needed: sku, and count (stocktake) or delta (+/−)." };
    if (rows.length > 2000) return { ...report, error: "Up to 2,000 rows per import." };
    await db();
    const products = await Product.find({ "variants.sku": { $in: rows.map((r) => (r.sku ?? "").toUpperCase()) } }).select("slug variants.sku variants.stock").lean();
    const where = new Map(products.flatMap((p) => p.variants.map((v) => [v.sku, { productId: String(p._id), slug: p.slug, stock: v.stock }] as const)));
    for (const r of rows) {
      const sku = (r.sku ?? "").toUpperCase();
      const hit = where.get(sku);
      if (!hit) {
        report.problems.push(`${sku || "(blank)"}: unknown SKU`);
        continue;
      }
      const n = Number((r.count || r.delta || "").replace(/[\s,]/g, ""));
      if (!Number.isInteger(n)) {
        report.problems.push(`${sku}: not a whole number`);
        continue;
      }
      const delta = r.count !== undefined && r.count !== "" ? n - hit.stock : n;
      if (hit.stock + delta < 0) report.problems.push(`${sku}: would go below zero`);
      else if (delta !== 0) report.changes.push({ sku, from: hit.stock, to: hit.stock + delta, delta });
    }
    if (apply && report.problems.length === 0) {
      const actor = { name: user.name, role: user.role, userId: user.id };
      for (const c of report.changes) await adjust({ productId: where.get(c.sku)!.productId, sku: c.sku, qty: Math.abs(c.delta), delta: c.delta }, why, actor);
      revalidateProducts(report.changes.map((c) => where.get(c.sku)!.slug));
      revalidatePath("/admin/inventory");
      report.applied = true;
    }
    return report;
  } catch (e) {
    return { ...report, error: toFormError(e, "import_stock").error };
  }
}
