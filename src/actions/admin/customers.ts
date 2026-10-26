"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/server/auth";
import { addressInput } from "@/schemas/checkout";
import { createCustomer, CustomerError, setCustomerFlags, updateCustomer } from "@/server/services/customers";
import { AddressError, deleteAddress, saveAddress, setDefaultAddress } from "@/server/services/addresses";
import { AuditLog } from "@/server/models/commerce";
import { db } from "@/server/db/connect";
import { toFormError, type FormState } from "./shared";

/** Customer records from the admin (plan.md §5). Admin role: these hold personal data. */

const id = z.string().regex(/^[a-f0-9]{24}$/);
const phone = z.union([z.literal(""), z.string().trim().regex(/^(\+91)?[6-9]\d{9}$/, "Enter a 10-digit Indian mobile number")]);
const actorOf = (u: { id: string; name: string; role: string }) => ({ userId: u.id, name: u.name, role: u.role });
const fail = (e: unknown, ctx: string): FormState => (e instanceof CustomerError || e instanceof AddressError ? { error: e.message } : toFormError(e, ctx));
const first = (e: z.ZodError) => e.issues[0]?.message ?? "Please check the form.";

export async function createCustomerAction(raw: unknown): Promise<FormState & { id?: string }> {
  try {
    const user = await requireRole("admin");
    const v = z.object({ name: z.string().trim().min(2, "Enter a name").max(80), email: z.email("Enter a valid email").trim(), phone }).safeParse(raw);
    if (!v.success) return { error: first(v.error) };
    const newId = await createCustomer(v.data, actorOf(user));
    revalidatePath("/admin/customers");
    return { ok: true, message: "Customer added. They can sign in with an email code.", id: newId };
  } catch (e) {
    return fail(e, "create_customer");
  }
}

export async function updateCustomerAction(customerId: string, raw: unknown): Promise<FormState> {
  try {
    const user = await requireRole("admin");
    const v = z.object({ name: z.string().trim().min(2, "Enter a name").max(80), phone }).safeParse(raw);
    if (!v.success) return { error: first(v.error) };
    await updateCustomer(id.parse(customerId), v.data, actorOf(user));
    revalidatePath(`/admin/customers/${customerId}`);
    return { ok: true, message: "Customer updated." };
  } catch (e) {
    return fail(e, "update_customer");
  }
}

export async function setCustomerFlagsAction(customerId: string, raw: unknown): Promise<FormState> {
  try {
    const user = await requireRole("admin");
    const flags = z.object({ disabled: z.boolean().optional(), codBlocked: z.boolean().optional() }).parse(raw);
    await setCustomerFlags(id.parse(customerId), flags, actorOf(user));
    revalidatePath(`/admin/customers/${customerId}`);
    const msg = flags.disabled !== undefined ? (flags.disabled ? "Account deactivated and signed out everywhere." : "Account reactivated.") : flags.codBlocked ? "Cash on delivery blocked for this customer." : "Cash on delivery allowed again.";
    return { ok: true, message: msg };
  } catch (e) {
    return fail(e, "customer_flags");
  }
}

async function logAddress(user: { id: string; name: string; role: string }, customerId: string, action: string) {
  await db();
  await AuditLog.create({ actor: actorOf(user), action: `customer.address_${action}`, entity: { kind: "user", id: customerId } });
}

/** Bound to a customer id in the page, so the shared address book can call it. */
export async function saveCustomerAddressAction(customerId: string, raw: unknown, addressId?: string, makeDefault = false): Promise<FormState> {
  try {
    const user = await requireRole("admin");
    const v = addressInput.safeParse(raw);
    if (!v.success) return { error: first(v.error) };
    await saveAddress(id.parse(customerId), v.data, addressId, makeDefault);
    await logAddress(user, customerId, addressId ? "update" : "create");
    revalidatePath(`/admin/customers/${customerId}`);
    return { ok: true, message: "Address saved." };
  } catch (e) {
    return fail(e, "save_customer_address");
  }
}

export async function deleteCustomerAddressAction(customerId: string, addressId: string): Promise<FormState> {
  try {
    const user = await requireRole("admin");
    await deleteAddress(id.parse(customerId), addressId);
    await logAddress(user, customerId, "delete");
    revalidatePath(`/admin/customers/${customerId}`);
    return { ok: true, message: "Address deleted." };
  } catch (e) {
    return fail(e, "delete_customer_address");
  }
}

export async function defaultCustomerAddressAction(customerId: string, addressId: string): Promise<FormState> {
  try {
    const user = await requireRole("admin");
    await setDefaultAddress(id.parse(customerId), addressId);
    await logAddress(user, customerId, "default");
    revalidatePath(`/admin/customers/${customerId}`);
    return { ok: true, message: "Default address changed." };
  } catch (e) {
    return fail(e, "default_customer_address");
  }
}
