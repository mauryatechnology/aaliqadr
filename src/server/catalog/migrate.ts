import "server-only";
import { randomUUID } from "node:crypto";
import { Types } from "mongoose";
import { db } from "@/server/db/connect";
import { Product } from "@/server/models/Product";
import { Category, Collection, HsnCode } from "@/server/models/catalog";
import { SEED_CATEGORIES, SEED_COLLECTIONS, SEED_HSN, SEED_PRODUCTS } from "./seed";
import type { ProductType } from "./types";

/**
 * Brings the catalogue up to the categories/collections/options model (docs/04 §4.3).
 * Idempotent: inserts what is missing and fills empty fields; never overwrites edits.
 *   npm run db:migrate-catalog   (also run by db:seed)
 */
export async function migrateCatalog(log: (s: string) => void = console.log) {
  await db();

  for (const h of SEED_HSN) await HsnCode.updateOne({ code: h.code }, { $setOnInsert: { ...h, isActive: true } }, { upsert: true });
  // Every HSN already used by a product joins the master.
  for (const code of await Product.distinct("hsnCode")) {
    const sample = await Product.findOne({ hsnCode: code }).select("gstRateBps").lean();
    await HsnCode.updateOne({ code }, { $setOnInsert: { code, description: "Added from existing products", gstRateBps: sample?.gstRateBps ?? 1800, isActive: true } }, { upsert: true });
  }

  const idBySeed = new Map<string, Types.ObjectId>();
  for (const c of SEED_CATEGORIES) {
    const parentId = c.parentId ? idBySeed.get(c.parentId) : null;
    const doc = await Category.findOneAndUpdate(
      { slug: c.slug },
      { $setOnInsert: { slug: c.slug, name: c.name, description: c.description, parentId, sortOrder: c.sortOrder, isActive: true } },
      { upsert: true, returnDocument: "after" },
    ).lean();
    if (doc) idBySeed.set(c.id, doc._id);
  }
  for (const c of SEED_COLLECTIONS) {
    const { id: _id, productIds: _p, ...fields } = c;
    await Collection.updateOne({ slug: c.slug }, { $setOnInsert: { ...fields, productIds: [] } }, { upsert: true });
  }

  const byType: Record<ProductType, string> = { fragrance: "seed-cat-signature", bundle: "seed-cat-discovery", gift_set: "seed-cat-gifts", body_care: "seed-cat-perfumes", accessory: "seed-cat-perfumes" };
  const seedBySlug = new Map(SEED_PRODUCTS.map((p) => [p.slug, p]));
  let touched = 0;
  for (const p of await Product.find().lean()) {
    const seed = seedBySlug.get(p.slug);
    const set: Record<string, unknown> = {};
    if (!p.categoryId) set.categoryId = idBySeed.get(seed?.categoryId ?? byType[p.type]) ?? idBySeed.get("seed-cat-perfumes");
    if (!p.tags?.length && seed?.tags.length) set.tags = seed.tags;
    if (!p.badges?.length && seed?.badges.length) set.badges = seed.badges;
    if (!p.options?.length && p.variants.length > 1) {
      set.options = [{ name: "Size", values: p.variants.map((v) => v.label) }];
      set.variants = p.variants.map((v) => ({ ...v, optionValues: [v.label], mediaIds: v.mediaIds ?? [] }));
    } else if (p.variants.some((v) => !v.optionValues)) {
      set.variants = p.variants.map((v) => ({ ...v, optionValues: v.optionValues ?? [], mediaIds: v.mediaIds ?? [] }));
    }
    if (p.media?.some((m) => !m.id)) set.media = p.media.map((m) => ({ ...m, id: m.id ?? randomUUID().slice(0, 8), kind: m.kind ?? "image" }));
    // Per-variant photos (plan.md §8.3): a photo a variant pointed at becomes that variant's own.
    if (p.variants.some((v) => v.mediaIds?.length)) {
      const media = ((set.media as typeof p.media) ?? p.media).map((m) => {
        if (m.scope?.kind && m.scope.kind !== "shared") return m;
        const owner = p.variants.find((v) => v.mediaIds?.includes(m.id));
        return owner ? { ...m, scope: { kind: "variant", sku: owner.sku } } : m;
      });
      set.media = media;
      set.variants = ((set.variants as typeof p.variants) ?? p.variants).map((v) => ({ ...v, mediaIds: [] }));
    }
    if (Object.keys(set).length) {
      await Product.updateOne({ _id: p._id }, { $set: set });
      touched++;
    }
  }
  log(`Catalogue migrated: ${SEED_CATEGORIES.length} categories, ${SEED_COLLECTIONS.length} collections, HSN master ready, ${touched} product(s) updated.`);
}
