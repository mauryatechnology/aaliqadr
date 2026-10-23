"use server";

import { updateTag } from "next/cache";
import { Types } from "mongoose";
import { z } from "zod";
import { requireRole } from "@/server/auth";
import { db } from "@/server/db/connect";
import { Product } from "@/server/models/Product";
import { Category, Collection, HsnCode } from "@/server/models/catalog";
import { AuditLog } from "@/server/models/commerce";
import { categoryFromDoc, collectionProducts, fromDoc, tags, type LeanProduct } from "@/server/queries/catalog";
import { categoryInput, collectionInput, hsnInput, ruleInput } from "@/schemas/product";
import { toFormError, type FormState } from "./shared";

/** Categories, collections and the HSN master (docs/11 §3.3). Admin role. */

const objectId = z.string().regex(/^[a-f0-9]{24}$/);
const actorOf = (u: { id: string; name: string; role: string }) => ({ userId: u.id, name: u.name, role: u.role });
const firstIssue = (e: z.ZodError) => {
  const i = e.issues[0];
  return i ? `${i.path.filter((p) => typeof p === "string").join(" › ") || "Form"}: ${i.message}` : "Please check the form.";
};

// ── Categories ──────────────────────────────────────────────────────────────

export async function saveCategoryAction(raw: unknown): Promise<FormState & { id?: string }> {
  try {
    const user = await requireRole("admin");
    const parsed = categoryInput.safeParse(raw);
    if (!parsed.success) return { error: firstIssue(parsed.error) };
    const c = parsed.data;
    await db();
    if (await Category.exists({ slug: c.slug, ...(c.id ? { _id: { $ne: c.id } } : {}) })) return { error: `Another category already uses /${c.slug}.` };
    if (c.parentId) {
      if (c.parentId === c.id) return { error: "A category can't be its own parent." };
      // Walk up from the new parent: it must not pass through this category (no cycles).
      let cur = await Category.findById(c.parentId).select("parentId").lean();
      if (!cur) return { error: "That parent category no longer exists." };
      for (let depth = 0; cur?.parentId && depth < 10; depth++) {
        if (c.id && String(cur.parentId) === c.id) return { error: "That would put the category inside itself." };
        cur = await Category.findById(cur.parentId).select("parentId").lean();
      }
    }
    const doc = {
      name: c.name,
      slug: c.slug,
      parentId: c.parentId ? new Types.ObjectId(c.parentId) : null,
      description: c.description,
      image: c.image,
      sortOrder: c.sortOrder,
      isActive: c.isActive,
      seo: { title: c.seoTitle || undefined, description: c.seoDescription || undefined },
    };
    let id = c.id;
    if (id) await Category.updateOne({ _id: id }, { $set: doc, ...(c.image ? {} : { $unset: { image: 1 } }) });
    else id = String((await Category.create(doc))._id);
    await AuditLog.create({ actor: actorOf(user), action: c.id ? "category.update" : "category.create", entity: { kind: "category", id }, detail: { slug: c.slug } });
    updateTag(tags.categories);
    updateTag(tags.products);
    return { ok: true, message: c.id ? "Category saved." : "Category created.", id };
  } catch (e) {
    return toFormError(e, "save_category");
  }
}

export async function deleteCategoryAction(id: string): Promise<FormState> {
  try {
    const user = await requireRole("admin");
    await db();
    const _id = objectId.parse(id);
    const [children, products] = await Promise.all([Category.countDocuments({ parentId: _id }), Product.countDocuments({ categoryId: _id })]);
    if (children) return { error: `Move or delete its ${children} sub-categor${children === 1 ? "y" : "ies"} first.` };
    if (products) return { error: `${products} product${products === 1 ? " is" : "s are"} in this category. Move ${products === 1 ? "it" : "them"} first.` };
    const doc = await Category.findByIdAndDelete(_id).lean();
    if (doc) await AuditLog.create({ actor: actorOf(user), action: "category.delete", entity: { kind: "category", id }, detail: { slug: doc.slug } });
    updateTag(tags.categories);
    return { ok: true, message: "Category deleted." };
  } catch (e) {
    return toFormError(e, "delete_category");
  }
}

// ── Collections ─────────────────────────────────────────────────────────────

export async function saveCollectionAction(raw: unknown): Promise<FormState & { id?: string }> {
  try {
    const user = await requireRole("admin");
    const parsed = collectionInput.safeParse(raw);
    if (!parsed.success) return { error: firstIssue(parsed.error) };
    const c = parsed.data;
    await db();
    if (await Collection.exists({ slug: c.slug, ...(c.id ? { _id: { $ne: c.id } } : {}) })) return { error: `Another collection already uses /${c.slug}.` };
    const doc = {
      name: c.name,
      slug: c.slug,
      description: c.description,
      kind: c.kind,
      productIds: c.kind === "manual" ? [...new Set(c.productIds)].map((p) => new Types.ObjectId(p)) : [],
      rules: c.rules,
      image: c.image,
      banner: c.banner,
      featured: c.featured,
      sortOrder: c.sortOrder,
      isActive: c.isActive,
      seo: { title: c.seoTitle || undefined, description: c.seoDescription || undefined },
    };
    let id = c.id;
    const unset = { ...(c.image ? {} : { image: 1 }), ...(c.banner ? {} : { banner: 1 }) };
    if (id) await Collection.updateOne({ _id: id }, { $set: doc, ...(Object.keys(unset).length ? { $unset: unset } : {}) });
    else id = String((await Collection.create(doc))._id);
    await AuditLog.create({ actor: actorOf(user), action: c.id ? "collection.update" : "collection.create", entity: { kind: "collection", id }, detail: { slug: c.slug } });
    updateTag(tags.collections);
    return { ok: true, message: c.id ? "Collection saved." : "Collection created.", id };
  } catch (e) {
    return toFormError(e, "save_collection");
  }
}

export async function deleteCollectionAction(id: string): Promise<FormState> {
  try {
    const user = await requireRole("admin");
    await db();
    const doc = await Collection.findByIdAndDelete(objectId.parse(id)).lean();
    if (doc) await AuditLog.create({ actor: actorOf(user), action: "collection.delete", entity: { kind: "collection", id }, detail: { slug: doc.slug } });
    updateTag(tags.collections);
    return { ok: true, message: "Collection deleted." };
  } catch (e) {
    return toFormError(e, "delete_collection");
  }
}

/** Live preview of a smart collection's rules against every product (any status). */
export async function previewRulesAction(raw: unknown): Promise<{ products?: { id: string; name: string; status: string }[]; error?: string }> {
  try {
    await requireRole("staff");
    const rules = z.object({ match: z.enum(["all", "any"]), conditions: z.array(ruleInput).min(1).max(10) }).safeParse(raw);
    if (!rules.success) return { error: "Complete every rule to preview." };
    await db();
    const [docs, cats] = await Promise.all([Product.find().lean<(LeanProduct & { status: string })[]>(), Category.find().lean()]);
    const statusById = new Map(docs.map((d) => [String(d._id), d.status]));
    const matched = collectionProducts(
      { id: "", slug: "", name: "", description: "", kind: "smart", productIds: [], rules: rules.data, featured: false, sortOrder: 0, isActive: true, seo: {} },
      docs.map(fromDoc),
      cats.map(categoryFromDoc),
    );
    return { products: matched.map((p) => ({ id: p.id, name: p.name, status: statusById.get(p.id) ?? "draft" })) };
  } catch (e) {
    return { error: toFormError(e, "preview_rules").error };
  }
}

// ── HSN master ──────────────────────────────────────────────────────────────

export async function saveHsnAction(raw: unknown): Promise<FormState> {
  try {
    const user = await requireRole("admin");
    const parsed = hsnInput.safeParse(raw);
    if (!parsed.success) return { error: firstIssue(parsed.error) };
    const h = parsed.data;
    await db();
    const gstRateBps = Math.round(h.gstRatePercent * 100);
    if (h.id) {
      const before = await HsnCode.findById(h.id).lean();
      if (!before) return { error: "That HSN code no longer exists." };
      if (before.code !== h.code && (await Product.exists({ hsnCode: before.code }))) return { error: `Products use ${before.code}; add ${h.code} as a new code instead of renaming.` };
      await HsnCode.updateOne({ _id: h.id }, { $set: { code: h.code, description: h.description, gstRateBps, isActive: h.isActive } });
      // A rate change flows to every product on the code; orders keep their snapshot.
      if (before.gstRateBps !== gstRateBps) {
        const updated = await Product.updateMany({ hsnCode: h.code }, { $set: { gstRateBps } });
        if (updated.modifiedCount) updateTag(tags.products);
      }
    } else {
      await HsnCode.create({ code: h.code, description: h.description, gstRateBps, isActive: h.isActive });
    }
    await AuditLog.create({ actor: actorOf(user), action: h.id ? "hsn.update" : "hsn.create", entity: { kind: "hsn", id: h.code }, detail: { gstRateBps } });
    return { ok: true, message: `HSN ${h.code} saved.` };
  } catch (e) {
    return toFormError(e, "save_hsn");
  }
}

export async function deleteHsnAction(id: string): Promise<FormState> {
  try {
    const user = await requireRole("admin");
    await db();
    const doc = await HsnCode.findById(objectId.parse(id)).lean();
    if (!doc) return { ok: true };
    const used = await Product.countDocuments({ hsnCode: doc.code });
    if (used) return { error: `${used} product${used === 1 ? " uses" : "s use"} ${doc.code}. Switch it off instead, or move the products first.` };
    await HsnCode.deleteOne({ _id: doc._id });
    await AuditLog.create({ actor: actorOf(user), action: "hsn.delete", entity: { kind: "hsn", id: doc.code } });
    return { ok: true, message: `HSN ${doc.code} deleted.` };
  } catch (e) {
    return toFormError(e, "delete_hsn");
  }
}
