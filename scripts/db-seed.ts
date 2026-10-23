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

async function main() {
  await db();
  let created = 0;
  let updated = 0;
  for (const p of SEED_PRODUCTS) {
    const { id: _id, updatedAt: _u, ratingAvg: _ra, ratingCount: _rc, salesCount: _sc, variants, ...fields } = p;
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
}

main()
  .catch((err: unknown) => {
    console.error(err instanceof NotConfiguredError ? `✗ ${err.message}` : err);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
