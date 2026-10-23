/**
 * Seeds the launch catalogue into MongoDB (idempotent: upserts by slug).
 *   npm run db:seed
 * Existing products keep their stock and ratings; only catalogue fields are refreshed.
 */
import mongoose from "mongoose";
import { NotConfiguredError } from "@/env";
import { db } from "@/server/db/connect";
import { Product } from "@/server/models/Product";
import { SEED_PRODUCTS } from "@/server/catalog/seed";
import { migrateCatalog } from "@/server/catalog/migrate";

async function main() {
  await db();
  let created = 0;
  let updated = 0;
  for (const p of SEED_PRODUCTS) {
    // Catalogue structure (category, tags, badges, options) is filled by migrateCatalog below;
    // admin-authored content (specs, A+ blocks, display) is never overwritten by a re-seed.
    const { id: _id, updatedAt: _u, createdAt: _c, ratingAvg: _ra, ratingCount: _rc, salesCount: _sc, categoryId: _cat, tags: _t, badges: _b, options: _o, specs: _sp, aPlus: _ap, display: _d, variants, ...fields } = p;
    const existing = await Product.findOne({ slug: p.slug }).lean();
    if (!existing) {
      await Product.create({ ...fields, variants, status: "active", publishedAt: new Date() });
      created++;
    } else {
      // Preserve live stock per SKU; refresh everything else from the seed.
      const stockBySku = new Map(existing.variants.map((v) => [v.sku, { stock: v.stock, reserved: v.reserved }]));
      const merged = variants.map((v) => ({ ...v, ...(stockBySku.get(v.sku) ?? {}) }));
      await Product.updateOne({ _id: existing._id }, { $set: { ...fields, variants: merged } });
      updated++;
    }
  }
  console.log(`Seed complete: ${created} created, ${updated} updated.`);
  await migrateCatalog();
}

main()
  .catch((err: unknown) => {
    console.error(err instanceof NotConfiguredError ? `✗ ${err.message}` : err);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
