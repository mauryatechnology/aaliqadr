import "server-only";
import { Types } from "mongoose";
import { db } from "@/server/db/connect";
import { AuditLog, AuthUser } from "@/server/models/commerce";
import { mongoClient } from "@/server/db/mongo-client";
import type { Actor } from "./inventory";

/** Customer records managed from the admin (plan.md §5). Accounts live in Better Auth's `user` collection. */

export class CustomerError extends Error {}
type AdminActor = Actor & { userId: string };

const userId = (id: string) => {
  if (!/^[a-f0-9]{24}$/.test(id)) throw new CustomerError("Customer not found.");
  return new Types.ObjectId(id);
};

/**
 * Adds a customer taken by phone. No password: they sign in later with an email code, which
 * finds this account by email. Unverified, so no role can ever attach to it.
 */
export async function createCustomer(input: { name: string; email: string; phone?: string }, actor: AdminActor): Promise<string> {
  await db();
  const email = input.email.trim().toLowerCase();
  if (await AuthUser.exists({ email })) throw new CustomerError("A customer with that email already exists.");
  const now = new Date();
  const _id = new Types.ObjectId();
  await mongoClient.db().collection("user").insertOne({ _id, name: input.name.trim(), email, emailVerified: false, image: null, role: "customer", phone: input.phone || null, createdAt: now, updatedAt: now });
  await AuditLog.create({ actor, action: "customer.create", entity: { kind: "user", id: String(_id) }, detail: { email } });
  return String(_id);
}

export async function updateCustomer(id: string, input: { name: string; phone?: string }, actor: AdminActor) {
  await db();
  const _id = userId(id);
  const before = await mongoClient.db().collection("user").findOneAndUpdate({ _id }, { $set: { name: input.name.trim(), phone: input.phone || null, updatedAt: new Date() } });
  if (!before) throw new CustomerError("Customer not found.");
  await AuditLog.create({ actor, action: "customer.update", entity: { kind: "user", id }, detail: { before: { name: before.name, phone: before.phone } } });
}

/**
 * Deactivating signs the person out everywhere and stops new sign-ins; blocking COD makes
 * checkout offer prepaid only. Staff accounts can't be deactivated here (remove access first).
 */
export async function setCustomerFlags(id: string, flags: { disabled?: boolean; codBlocked?: boolean }, actor: AdminActor) {
  await db();
  const _id = userId(id);
  const users = mongoClient.db().collection("user");
  const u = await users.findOne({ _id });
  if (!u) throw new CustomerError("Customer not found.");
  if (flags.disabled && u.role && u.role !== "customer") throw new CustomerError("Remove this person's staff access before deactivating the account.");
  if (flags.disabled && id === actor.userId) throw new CustomerError("You can't deactivate your own account.");
  const set: Record<string, unknown> = { updatedAt: new Date() };
  if (flags.disabled !== undefined) set.disabled = flags.disabled;
  if (flags.codBlocked !== undefined) set.codBlocked = flags.codBlocked;
  await users.updateOne({ _id }, { $set: set });
  if (flags.disabled) await mongoClient.db().collection("session").deleteMany({ userId: { $in: [_id, id] } });
  await AuditLog.create({ actor, action: "customer.flags", entity: { kind: "user", id }, detail: flags });
}

export async function isCodBlocked(email: string): Promise<boolean> {
  await db();
  return !!(await AuthUser.exists({ email: email.trim().toLowerCase(), codBlocked: true }));
}
