"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { customerCanCancel } from "@/lib/order-status";
import { headers } from "next/headers";
import { auth, getSessionUser } from "@/server/auth";
import { isBreachedPassword, passwordProblem } from "@/server/auth-password";
import { rateLimit, RateLimitError } from "@/server/rate-limit";
import { getOrderForViewer } from "@/server/queries/account";
import { cancelOrder, OrderError } from "@/server/services/orders";

const input = z.object({ orderId: z.string().regex(/^AQ-\d{6,}$/), accessKey: z.string().max(64).optional() }).strict();

/** Customer cancels their own order before dispatch (docs/05 §2.4). */
export async function cancelMyOrderAction(raw: unknown): Promise<{ ok: true; refunded: boolean } | { ok: false; error: string }> {
  const parsed = input.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Order not found." };
  const user = await getSessionUser();
  const found = await getOrderForViewer(parsed.data.orderId, user, parsed.data.accessKey);
  if (!found) return { ok: false, error: "Order not found." };
  if (!customerCanCancel(found.order.status)) return { ok: false, error: "This order has already been dispatched and can't be cancelled." };
  try {
    const actor = user ? { name: user.name, role: "customer", userId: user.id } : { name: found.order.contact.name, role: "customer" };
    const { refunded } = await cancelOrder(found.order._id, actor, "Cancelled by customer");
    revalidatePath(`/order/${found.order._id}`);
    revalidatePath(`/account/orders/${found.order._id}`);
    return { ok: true, refunded };
  } catch (e) {
    if (e instanceof OrderError) return { ok: false, error: e.message };
    console.error(JSON.stringify({ evt: "cancel_my_order.failed", error: (e as Error).message }));
    return { ok: false, error: "We couldn't cancel this order. Please contact us." };
  }
}

/** Sets a first password for an account created by email code or Google (plan.md §6.7). */
export async function setMyPasswordAction(newPassword: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "Please sign in again." };
  const problem = passwordProblem(newPassword);
  if (problem) return { ok: false, error: problem };
  try {
    await rateLimit("login", `set:${user.id}`);
    if (await isBreachedPassword(newPassword)) return { ok: false, error: "This password has appeared in a data breach. Please choose a different one." };
    await auth.api.setPassword({ body: { newPassword }, headers: await headers() });
    return { ok: true };
  } catch (e) {
    if (e instanceof RateLimitError) return { ok: false, error: e.message };
    const msg = (e as { body?: { code?: string } }).body?.code;
    if (msg === "PASSWORD_ALREADY_SET") return { ok: false, error: "You already have a password; use Change password instead." };
    console.error(JSON.stringify({ evt: "set_password.failed", error: (e as Error).message }));
    return { ok: false, error: "We couldn't set your password. Please try again." };
  }
}
