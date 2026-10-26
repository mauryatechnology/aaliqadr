"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/server/auth";
import { db } from "@/server/db/connect";
import { Order } from "@/server/models/Order";
import { advanceOrder, audit, cancelOrder } from "@/server/services/orders";
import { csvRecords } from "@/lib/csv";
import { addressInput } from "@/schemas/checkout";
import { editOrderDelivery, refundPartOfOrder } from "@/server/services/order-edits";
import { str, toFormError, type FormState } from "./shared";

const orderId = z.string().regex(/^AQ-\d{6,}$/);

const advanceSchema = z.discriminatedUnion("to", [
  z.object({ orderId, to: z.literal("processing") }),
  z.object({ orderId, to: z.literal("delivered") }),
  z.object({
    orderId,
    to: z.literal("shipped"),
    courier: z.string().trim().min(2, "Enter the courier").max(60),
    awb: z.string().trim().min(4, "Enter the tracking (AWB) number").max(40).regex(/^[A-Za-z0-9-]+$/, "Letters, numbers and dashes only"),
    trackingUrl: z.union([z.literal(""), z.url("Enter a full https:// link")]).optional(),
  }),
]);

export async function advanceOrderAction(_prev: FormState, fd: FormData): Promise<FormState> {
  try {
    const user = await requireRole("staff");
    const parsed = advanceSchema.safeParse({ orderId: str(fd, "orderId"), to: str(fd, "to"), courier: str(fd, "courier"), awb: str(fd, "awb"), trackingUrl: str(fd, "trackingUrl") });
    if (!parsed.success) return { error: "Please check the highlighted fields.", fieldErrors: z.flattenError(parsed.error).fieldErrors as Record<string, string[]> };
    const v = parsed.data;
    const actor = { name: user.name, role: user.role, userId: user.id };
    await advanceOrder(v.orderId, v.to, actor, v.to === "shipped" ? { courier: v.courier, awb: v.awb, trackingUrl: v.trackingUrl || undefined } : undefined);
    revalidatePath(`/admin/orders/${v.orderId}`);
    return { ok: true, message: v.to === "shipped" ? "Marked shipped. The customer has been emailed." : v.to === "delivered" ? "Marked delivered." : "Marked as being prepared." };
  } catch (e) {
    return toFormError(e, "advance_order");
  }
}

export async function cancelOrderAdminAction(_prev: FormState, fd: FormData): Promise<FormState> {
  try {
    const user = await requireRole("admin");
    const parsed = z.object({ orderId, reason: z.string().trim().min(3, "Give a short reason").max(200) }).safeParse({ orderId: str(fd, "orderId"), reason: str(fd, "reason") });
    if (!parsed.success) return { error: "Give a short reason for the cancellation.", fieldErrors: z.flattenError(parsed.error).fieldErrors as Record<string, string[]> };
    const { refunded } = await cancelOrder(parsed.data.orderId, { name: user.name, role: user.role, userId: user.id }, parsed.data.reason);
    revalidatePath(`/admin/orders/${parsed.data.orderId}`);
    return { ok: true, message: refunded ? "Cancelled and fully refunded to the original payment method." : "Order cancelled and stock returned." };
  } catch (e) {
    return toFormError(e, "cancel_order");
  }
}

export async function addOrderNoteAction(_prev: FormState, fd: FormData): Promise<FormState> {
  try {
    const user = await requireRole("staff");
    const parsed = z.object({ orderId, note: z.string().trim().min(1).max(500) }).safeParse({ orderId: str(fd, "orderId"), note: str(fd, "note") });
    if (!parsed.success) return { error: "Write a note first." };
    await db();
    const stamp = new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" }).format(new Date());
    const order = await Order.findById(parsed.data.orderId).select("+notesInternal");
    if (!order) return { error: "Order not found." };
    order.notesInternal = `${order.notesInternal ? `${order.notesInternal}\n` : ""}[${stamp}] ${user.name}: ${parsed.data.note}`;
    await order.save();
    await audit({ name: user.name, role: user.role, userId: user.id }, "order.note", parsed.data.orderId);
    revalidatePath(`/admin/orders/${parsed.data.orderId}`);
    return { ok: true, message: "Note added." };
  } catch (e) {
    return toFormError(e, "order_note");
  }
}

// ── Bulk operations (plan.md §4) ─────────────────────────────────────────────

const ids = z.array(orderId).min(1).max(100);

/** Moves the selected confirmed orders to "being prepared". Others are skipped and counted. */
export async function bulkStartPackingAction(raw: unknown): Promise<FormState> {
  try {
    const user = await requireRole("staff");
    const list = ids.parse(raw);
    await db();
    const ready = await Order.find({ _id: { $in: list }, status: "confirmed" }).select("_id").lean();
    const actor = { name: user.name, role: user.role, userId: user.id };
    let done = 0;
    for (const o of ready) {
      await advanceOrder(String(o._id), "processing", actor);
      done++;
    }
    revalidatePath("/admin/orders");
    const skipped = list.length - done;
    return { ok: true, message: `${done} order${done === 1 ? "" : "s"} marked as being prepared${skipped ? `; ${skipped} skipped (not confirmed)` : ""}.` };
  } catch (e) {
    return toFormError(e, "bulk_start_packing");
  }
}

export interface ShipImportReport {
  error?: string;
  applied: boolean;
  ready: { order: string; courier: string; awb: string }[];
  problems: { order: string; message: string }[];
}

const shipRow = z.object({
  order: orderId,
  courier: z.string().trim().min(2).max(60),
  awb: z.string().trim().min(4).max(40).regex(/^[A-Za-z0-9-]+$/),
  tracking_url: z.union([z.literal(""), z.url()]).optional(),
});

/**
 * Marks orders shipped from a CSV of `order,courier,awb[,tracking_url]` (e.g. the courier's
 * manifest). `apply: false` only checks it; nothing is changed until the admin confirms.
 */
export async function shipFromCsvAction(text: string, apply: boolean): Promise<ShipImportReport> {
  const report: ShipImportReport = { applied: false, ready: [], problems: [] };
  try {
    const user = await requireRole("staff");
    if (text.length > 500_000) return { ...report, error: "That file is too large." };
    const records = csvRecords(text);
    if (!records.length) return { ...report, error: "The file has no rows." };
    if (!("order" in records[0]!) || !("awb" in records[0]!)) return { ...report, error: "The file needs columns: order, courier, awb (tracking_url optional)." };
    if (records.length > 500) return { ...report, error: "Up to 500 rows at a time." };
    await db();
    const rows: z.infer<typeof shipRow>[] = [];
    for (const r of records) {
      const parsed = shipRow.safeParse({ order: (r.order ?? "").trim().toUpperCase(), courier: r.courier ?? "", awb: r.awb ?? "", tracking_url: r.tracking_url ?? "" });
      if (!parsed.success) report.problems.push({ order: r.order || "(blank)", message: parsed.error.issues[0]?.message ?? "Check this row." });
      else rows.push(parsed.data);
    }
    const found = await Order.find({ _id: { $in: rows.map((r) => r.order) } }).select("_id status").lean();
    const status = new Map(found.map((o) => [String(o._id), o.status]));
    for (const r of rows) {
      const st = status.get(r.order);
      if (!st) report.problems.push({ order: r.order, message: "No such order." });
      else if (st !== "confirmed" && st !== "processing") report.problems.push({ order: r.order, message: `It is ${st.replace("_", " ")}, not ready to ship.` });
      else report.ready.push({ order: r.order, courier: r.courier, awb: r.awb });
    }
    if (apply && report.ready.length) {
      const actor = { name: user.name, role: user.role, userId: user.id };
      for (const r of rows.filter((x) => report.ready.some((y) => y.order === x.order))) {
        try {
          await advanceOrder(r.order, "shipped", actor, { courier: r.courier, awb: r.awb, trackingUrl: r.tracking_url || undefined });
        } catch (e) {
          report.problems.push({ order: r.order, message: (e as Error).message || "Couldn't mark it shipped." });
          report.ready = report.ready.filter((y) => y.order !== r.order);
        }
      }
      report.applied = true;
      revalidatePath("/admin/orders");
    }
    return report;
  } catch (e) {
    return { ...report, error: toFormError(e, "ship_from_csv").error };
  }
}

// ── Corrections & partial refunds (plan.md §5) ───────────────────────────────

export async function editOrderDeliveryAction(id: string, raw: unknown): Promise<FormState> {
  try {
    const user = await requireRole("staff");
    const v = z.object({ address: addressInput, giftMessage: z.string().trim().max(250).regex(/^[^<>]*$/).optional() }).safeParse(raw);
    if (!v.success) return { error: v.error.issues[0]?.message ?? "Check the address." };
    await editOrderDelivery(orderId.parse(id), v.data, { name: user.name, role: user.role, userId: user.id });
    revalidatePath(`/admin/orders/${id}`);
    return { ok: true, message: "Delivery details updated." };
  } catch (e) {
    return toFormError(e, "edit_order_delivery");
  }
}

export async function partialRefundAction(id: string, raw: unknown): Promise<FormState> {
  try {
    const user = await requireRole("admin");
    const v = z.object({ amount: z.number().positive().max(1_000_000), reason: z.string().trim().min(3, "Give a reason").max(200), reference: z.string().trim().max(80).optional() }).safeParse(raw);
    if (!v.success) return { error: v.error.issues[0]?.message ?? "Check the refund." };
    await refundPartOfOrder(orderId.parse(id), Math.round(v.data.amount * 100), v.data.reason, v.data.reference || undefined, { name: user.name, role: user.role, userId: user.id });
    revalidatePath(`/admin/orders/${id}`);
    return { ok: true, message: `Refunded ₹${v.data.amount.toFixed(2)}.` };
  } catch (e) {
    return toFormError(e, "partial_refund");
  }
}
