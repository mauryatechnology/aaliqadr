"use server";

import { updateTag } from "next/cache";
import { Types } from "mongoose";
import { z } from "zod";
import { rupeesToPaise } from "@/lib/money";
import { requireRole } from "@/server/auth";
import { db } from "@/server/db/connect";
import { AuditLog, Settings } from "@/server/models/commerce";
import { Content, POLICY_KEYS, PolicyVersion, Review, StaffInvite } from "@/server/models/engagement";
import { engagementTags } from "@/server/queries/engagement";
import { tags } from "@/server/queries/catalog";
import { recomputeRating } from "@/server/services/reviews";
import { moveReturn, ReturnError, type ReturnAction } from "@/server/services/returns";
import { toFormError, type FormState } from "./shared";

/** Reviews, returns, storefront content, staff and shipping (docs/11 §3.5–3.10). */

const objectId = z.string().regex(/^[a-f0-9]{24}$/);
const actorOf = (u: { id: string; name: string; role: string }) => ({ userId: u.id, name: u.name, role: u.role });
const first = (e: z.ZodError) => e.issues[0]?.message ?? "Please check the form.";

// ── Reviews ─────────────────────────────────────────────────────────────────

async function afterReviewChange(productId: string) {
  const slug = await recomputeRating(productId);
  updateTag(engagementTags.reviews(productId));
  updateTag(tags.products);
  if (slug) updateTag(tags.product(slug));
}

export async function moderateReviewAction(id: string, status: "approved" | "rejected" | "pending"): Promise<FormState> {
  try {
    const user = await requireRole("staff");
    await db();
    const r = await Review.findByIdAndUpdate(objectId.parse(id), { $set: { status, moderatedBy: actorOf(user) } }).lean();
    if (!r) return { error: "Review not found." };
    await afterReviewChange(String(r.productId));
    await AuditLog.create({ actor: actorOf(user), action: `review.${status}`, entity: { kind: "review", id } });
    return { ok: true, message: status === "approved" ? "Published." : status === "rejected" ? "Hidden." : "Moved back to pending." };
  } catch (e) {
    return toFormError(e, "moderate_review");
  }
}

export async function replyReviewAction(id: string, body: string): Promise<FormState> {
  try {
    const user = await requireRole("staff");
    const text = z.string().trim().max(1000).regex(/^[^<>]*$/, "No angle brackets, please").safeParse(body);
    if (!text.success) return { error: first(text.error) };
    await db();
    const r = await Review.findByIdAndUpdate(objectId.parse(id), text.data ? { $set: { reply: { body: text.data, at: new Date(), by: user.name } } } : { $unset: { reply: 1 } }).lean();
    if (!r) return { error: "Review not found." };
    updateTag(engagementTags.reviews(String(r.productId)));
    return { ok: true, message: text.data ? "Reply saved." : "Reply removed." };
  } catch (e) {
    return toFormError(e, "reply_review");
  }
}

export async function deleteReviewAction(id: string): Promise<FormState> {
  try {
    const user = await requireRole("admin");
    await db();
    const r = await Review.findByIdAndDelete(objectId.parse(id)).lean();
    if (r) {
      await afterReviewChange(String(r.productId));
      await AuditLog.create({ actor: actorOf(user), action: "review.delete", entity: { kind: "review", id } });
    }
    return { ok: true, message: "Review deleted." };
  } catch (e) {
    return toFormError(e, "delete_review");
  }
}

// ── Returns & claims ────────────────────────────────────────────────────────

const returnAction = z.discriminatedUnion("to", [
  z.object({ to: z.literal("approved"), resolution: z.enum(["refund", "replacement"]), note: z.string().trim().max(500).optional() }),
  z.object({ to: z.literal("rejected"), note: z.string().trim().min(5, "Tell the customer why").max(500) }),
  z.object({ to: z.literal("received"), note: z.string().trim().max(500).optional() }),
  z.object({ to: z.literal("refunded"), amount: z.number().positive().max(1_000_000), note: z.string().trim().max(500).optional(), reference: z.string().trim().max(80).optional() }),
  z.object({ to: z.literal("replaced"), courier: z.string().trim().min(2).max(60), awb: z.string().trim().min(4).max(40), note: z.string().trim().max(500).optional() }),
  z.object({ to: z.literal("closed"), note: z.string().trim().max(500).optional() }),
]);

export async function moveReturnAction(id: string, raw: unknown): Promise<FormState> {
  try {
    const parsed = returnAction.safeParse(raw);
    if (!parsed.success) return { error: first(parsed.error) };
    const a = parsed.data;
    // Money leaves the business only with an admin's approval.
    const user = await requireRole(a.to === "refunded" ? "admin" : "staff");
    const action: ReturnAction = a.to === "refunded" ? { to: "refunded", amountP: rupeesToPaise(a.amount), note: a.note, reference: a.reference } : a;
    await moveReturn(z.string().regex(/^RT-\d{6,}$/).parse(id), action, actorOf(user));
    return { ok: true, message: `Marked ${a.to}. The customer has been emailed.` };
  } catch (e) {
    if (e instanceof ReturnError) return { error: e.message };
    return toFormError(e, "move_return");
  }
}

// ── Storefront content ──────────────────────────────────────────────────────

const imageRef = z.object({ url: z.url({ protocol: /^https$/ }), alt: z.string().trim().max(140), width: z.number().int().positive(), height: z.number().int().positive() });
const safeText = (max: number) => z.string().trim().max(max).regex(/^[^<>]*$/, "No angle brackets, please");
const href = z.string().trim().max(200).regex(/^(\/[\w\-./?=&%#]*|https:\/\/\S+)?$/, "Use a path like /shop or a full https:// link");

const contentInput = z.object({
  announcement: z.object({ text: safeText(160), href: href.optional(), active: z.boolean() }),
  banners: z.array(z.object({ id: z.string().min(1).max(20), title: safeText(80).min(1, "Every banner needs a title"), subtitle: safeText(200).optional(), cta: safeText(30).optional(), href: href.optional(), image: imageRef.optional(), active: z.boolean() })).max(8),
  faqs: z.array(z.object({ id: z.string().min(1).max(20), question: safeText(200).min(5, "Write the question"), answer: safeText(2000).min(5, "Write the answer"), group: safeText(40) })).max(60),
});

export async function saveContentAction(raw: unknown): Promise<FormState> {
  try {
    const user = await requireRole("admin");
    const parsed = contentInput.safeParse(raw);
    if (!parsed.success) return { error: first(parsed.error) };
    await db();
    await Content.updateOne({ _id: "storefront" }, { $set: parsed.data }, { upsert: true });
    await AuditLog.create({ actor: actorOf(user), action: "content.update", entity: { kind: "content", id: "storefront" } });
    updateTag(engagementTags.content);
    return { ok: true, message: "Published. The store shows it now." };
  } catch (e) {
    return toFormError(e, "save_content");
  }
}

const policyInput = z.object({
  key: z.enum(POLICY_KEYS),
  title: safeText(80).min(3),
  summary: safeText(400),
  sections: z.array(z.object({ heading: safeText(120).min(1, "Every section needs a heading"), body: safeText(4000).min(1, "Every section needs text") })).min(1).max(30),
});

/** Publishes a new policy version; every version is kept (PolicyVersion is append-only). */
export async function publishPolicyAction(raw: unknown): Promise<FormState> {
  try {
    const user = await requireRole("admin");
    const parsed = policyInput.safeParse(raw);
    if (!parsed.success) return { error: first(parsed.error) };
    const p = parsed.data;
    await db();
    const last = await PolicyVersion.findOne({ key: p.key }).sort({ version: -1 }).select("version").lean();
    const version = (last?.version ?? 0) + 1;
    await PolicyVersion.create({ ...p, version, publishedBy: actorOf(user) });
    await Content.updateOne({ _id: "storefront" }, { $set: { [`policies.${p.key}`]: { title: p.title, summary: p.summary, sections: p.sections, version, updatedAt: new Date() } } }, { upsert: true });
    await AuditLog.create({ actor: actorOf(user), action: "policy.publish", entity: { kind: "policy", id: p.key }, detail: { version } });
    updateTag(engagementTags.content);
    return { ok: true, message: `Version ${version} published.` };
  } catch (e) {
    return toFormError(e, "publish_policy");
  }
}

// ── Staff ───────────────────────────────────────────────────────────────────

export async function inviteStaffAction(raw: unknown): Promise<FormState> {
  try {
    const user = await requireRole("owner");
    const parsed = z.object({ email: z.email("Enter a valid email").trim().toLowerCase(), role: z.enum(["staff", "admin"]) }).safeParse(raw);
    if (!parsed.success) return { error: first(parsed.error) };
    const { email, role } = parsed.data;
    const conn = await db();
    const users = conn.connection.db!.collection<{ _id: Types.ObjectId; email: string; role?: string }>("user");
    const existing = await users.findOne({ email });
    if (existing) {
      if (existing.role === "owner") return { error: "That account is an owner already." };
      await users.updateOne({ _id: existing._id }, { $set: { role } });
      await conn.connection.db!.collection("session").deleteMany({ userId: { $in: [existing._id, String(existing._id)] } });
      await AuditLog.create({ actor: actorOf(user), action: "user.role", entity: { kind: "user", id: String(existing._id) }, detail: { from: existing.role ?? "customer", to: role } });
      return { ok: true, message: `${email} already had an account and is now ${role}. They'll need to sign in again.` };
    }
    await StaffInvite.updateOne({ email }, { $set: { role, invitedBy: actorOf(user) }, $unset: { acceptedAt: 1 } }, { upsert: true });
    await AuditLog.create({ actor: actorOf(user), action: "staff.invite", entity: { kind: "user", id: email }, detail: { role } });
    return { ok: true, message: `Invited. ${email} becomes ${role} the first time they sign in.` };
  } catch (e) {
    return toFormError(e, "invite_staff");
  }
}

export async function revokeInviteAction(id: string): Promise<FormState> {
  try {
    const user = await requireRole("owner");
    await db();
    const doc = await StaffInvite.findByIdAndDelete(objectId.parse(id)).lean();
    if (doc) await AuditLog.create({ actor: actorOf(user), action: "staff.revoke_invite", entity: { kind: "user", id: doc.email } });
    return { ok: true, message: "Invite withdrawn." };
  } catch (e) {
    return toFormError(e, "revoke_invite");
  }
}

// ── Shipping & store settings ───────────────────────────────────────────────

const shippingInput = z
  .object({
    freeShippingAbove: z.number().min(0).max(100000),
    slabs: z.array(z.object({ uptoG: z.number().int().min(1).max(30000), price: z.number().min(0).max(10000) })).min(1, "Add at least one weight slab").max(8),
    extraPer500g: z.number().min(0).max(10000),
    codEnabled: z.boolean(),
    codMaxOrder: z.number().min(0).max(1000000),
    codFee: z.number().min(0).max(10000),
  })
  .refine((s) => s.slabs.every((x, i) => i === 0 || x.uptoG > s.slabs[i - 1]!.uptoG), { message: "Each slab must be heavier than the one before", path: ["slabs"] });

export async function saveShippingAction(raw: unknown): Promise<FormState> {
  try {
    const user = await requireRole("admin");
    const parsed = shippingInput.safeParse(raw);
    if (!parsed.success) return { error: first(parsed.error) };
    const s = parsed.data;
    await db();
    await Settings.updateOne(
      { _id: "store" },
      {
        $set: {
          freeShippingAboveP: rupeesToPaise(s.freeShippingAbove),
          shippingSlabs: s.slabs.map((x) => ({ uptoG: x.uptoG, priceP: rupeesToPaise(x.price) })),
          extraPer500gP: rupeesToPaise(s.extraPer500g),
          codEnabled: s.codEnabled,
          codMaxOrderP: rupeesToPaise(s.codMaxOrder),
          codFeeP: rupeesToPaise(s.codFee),
        },
      },
      { upsert: true },
    );
    await AuditLog.create({ actor: actorOf(user), action: "settings.shipping", entity: { kind: "settings", id: "store" } });
    return { ok: true, message: "Shipping saved. New checkouts use it immediately." };
  } catch (e) {
    return toFormError(e, "save_shipping");
  }
}

const storeInput = z.object({
  giftWrap: z.number().min(0).max(10000),
  reservationMinutes: z.number().int().min(15).max(120),
  returnWindowHours: z.number().int().min(24).max(720),
});

export async function saveStoreSettingsAction(raw: unknown): Promise<FormState> {
  try {
    const user = await requireRole("admin");
    const parsed = storeInput.safeParse(raw);
    if (!parsed.success) return { error: first(parsed.error) };
    await db();
    await Settings.updateOne(
      { _id: "store" },
      { $set: { giftWrapP: rupeesToPaise(parsed.data.giftWrap), reservationMinutes: parsed.data.reservationMinutes, returnWindowHours: parsed.data.returnWindowHours } },
      { upsert: true },
    );
    await AuditLog.create({ actor: actorOf(user), action: "settings.update", entity: { kind: "settings", id: "store" } });
    return { ok: true, message: "Settings saved." };
  } catch (e) {
    return toFormError(e, "save_store_settings");
  }
}
