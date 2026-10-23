"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/server/auth";
import { db } from "@/server/db/connect";
import { Order } from "@/server/models/Order";
import { advanceOrder, audit, cancelOrder } from "@/server/services/orders";
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
