"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { rupeesToPaise } from "@/lib/money";
import { SKU_RE } from "@/lib/sku";
import { requireRole, ROLES } from "@/server/auth";
import { db } from "@/server/db/connect";
import { ObjectId } from "mongodb";
import { AuditLog, Coupon, Settings } from "@/server/models/commerce";
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

export async function setRoleAction(_prev: FormState, fd: FormData): Promise<FormState> {
  try {
    const user = await requireRole("owner");
    const parsed = z.object({ userId: z.string().regex(/^[a-f0-9]{24}$/), role: z.enum(ROLES) }).safeParse({ userId: str(fd, "userId"), role: str(fd, "role") });
    if (!parsed.success) return { error: "Choose a role." };
    if (parsed.data.userId === user.id) return { error: "You can't change your own role." };
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

const couponSchema = z
  .object({
    code: z.string().trim().toUpperCase().regex(/^[A-Z0-9]{4,20}$/, "4–20 letters or numbers"),
    description: z.string().trim().max(120),
    kind: z.enum(["percent", "flat", "free_shipping"]),
    value: z.coerce.number().min(0).max(100000),
    maxDiscount: z.coerce.number().min(0).max(100000),
    minSubtotal: z.coerce.number().min(0).max(1000000),
    startsAt: z.coerce.date(),
    endsAt: z.coerce.date(),
    usageLimit: z.coerce.number().int().min(0).max(1000000),
    perCustomerLimit: z.coerce.number().int().min(0).max(100),
  })
  .refine((c) => c.endsAt > c.startsAt, { message: "End date must be after the start", path: ["endsAt"] })
  .refine((c) => c.kind !== "percent" || (c.value > 0 && c.value <= 90), { message: "Percent must be between 1 and 90", path: ["value"] })
  .refine((c) => c.kind !== "flat" || c.value > 0, { message: "Enter the discount amount", path: ["value"] });

export async function createCouponAction(_prev: FormState, fd: FormData): Promise<FormState> {
  try {
    const user = await requireRole("admin");
    const keys = ["code", "description", "kind", "value", "maxDiscount", "minSubtotal", "startsAt", "endsAt", "usageLimit", "perCustomerLimit"];
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
      isActive: true,
    });
    await AuditLog.create({ actor: { userId: user.id, name: user.name, role: user.role }, action: "coupon.create", entity: { kind: "coupon", id: c.code } });
    revalidatePath("/admin/coupons");
    return { ok: true, message: `Coupon ${c.code} is live.` };
  } catch (e) {
    return toFormError(e, "create_coupon");
  }
}

export async function toggleCouponAction(_prev: FormState, fd: FormData): Promise<FormState> {
  try {
    const user = await requireRole("admin");
    const code = str(fd, "code").toUpperCase();
    const active = str(fd, "active") === "true";
    await db();
    await Coupon.updateOne({ code }, { $set: { isActive: active } });
    await AuditLog.create({ actor: { userId: user.id, name: user.name, role: user.role }, action: active ? "coupon.enable" : "coupon.disable", entity: { kind: "coupon", id: code } });
    revalidatePath("/admin/coupons");
    return { ok: true, message: `${code} ${active ? "enabled" : "paused"}.` };
  } catch (e) {
    return toFormError(e, "toggle_coupon");
  }
}

const settingsSchema = z.object({
  freeShippingAbove: z.coerce.number().min(0).max(100000),
  slab1UptoG: z.coerce.number().int().min(1).max(20000),
  slab1Price: z.coerce.number().min(0).max(10000),
  slab2UptoG: z.coerce.number().int().min(1).max(20000),
  slab2Price: z.coerce.number().min(0).max(10000),
  extraPer500g: z.coerce.number().min(0).max(10000),
  codEnabled: z.enum(["on", ""]).transform((v) => v === "on"),
  codMaxOrder: z.coerce.number().min(0).max(1000000),
  codFee: z.coerce.number().min(0).max(10000),
  giftWrap: z.coerce.number().min(0).max(10000),
  reservationMinutes: z.coerce.number().int().min(15).max(120),
}).refine((s) => s.slab2UptoG > s.slab1UptoG, { message: "Second slab must be heavier than the first", path: ["slab2UptoG"] });

export async function saveSettingsAction(_prev: FormState, fd: FormData): Promise<FormState> {
  try {
    const user = await requireRole("admin");
    const keys = ["freeShippingAbove", "slab1UptoG", "slab1Price", "slab2UptoG", "slab2Price", "extraPer500g", "codEnabled", "codMaxOrder", "codFee", "giftWrap", "reservationMinutes"];
    const parsed = settingsSchema.safeParse(Object.fromEntries(keys.map((k) => [k, str(fd, k)])));
    if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the form.", fieldErrors: fieldErrors(parsed.error) };
    const s = parsed.data;
    await db();
    await Settings.updateOne(
      { _id: "store" },
      {
        $set: {
          freeShippingAboveP: rupeesToPaise(s.freeShippingAbove),
          shippingSlabs: [
            { uptoG: s.slab1UptoG, priceP: rupeesToPaise(s.slab1Price) },
            { uptoG: s.slab2UptoG, priceP: rupeesToPaise(s.slab2Price) },
          ],
          extraPer500gP: rupeesToPaise(s.extraPer500g),
          codEnabled: s.codEnabled,
          codMaxOrderP: rupeesToPaise(s.codMaxOrder),
          codFeeP: rupeesToPaise(s.codFee),
          giftWrapP: rupeesToPaise(s.giftWrap),
          reservationMinutes: s.reservationMinutes,
        },
      },
      { upsert: true },
    );
    await AuditLog.create({ actor: { userId: user.id, name: user.name, role: user.role }, action: "settings.update", entity: { kind: "settings", id: "store" } });
    revalidatePath("/admin/settings");
    return { ok: true, message: "Settings saved. New checkouts use them immediately." };
  } catch (e) {
    return toFormError(e, "save_settings");
  }
}
