/**
 * Creates/updates MongoDB indexes for every model. Production runs with autoIndex off
 * (docs/04 §1), so run this after every schema change and on each production deploy:
 *   npm run db:sync-indexes
 * Some indexes are correctness, not performance (unique SKUs, slugs, payment IDs).
 */
import mongoose from "mongoose";
import { NotConfiguredError } from "@/env";
import { db } from "@/server/db/connect";
import { Product } from "@/server/models/Product";
import { Order } from "@/server/models/Order";
import { Address, AuditLog, Counter, Coupon, CouponRedemption, Payment, Settings, StockMovement, WebhookEvent } from "@/server/models/commerce";

const MODELS = [Product, Order, Payment, WebhookEvent, Coupon, CouponRedemption, StockMovement, Address, Settings, Counter, AuditLog];

async function main() {
  await db();
  for (const model of MODELS) {
    const dropped = await model.syncIndexes();
    const indexes = await model.listIndexes();
    console.log(`${model.modelName}: ${indexes.length} indexes${dropped.length ? `, dropped ${dropped.join(", ")}` : ""}`);
  }
}

main()
  .catch((err: unknown) => {
    console.error(err instanceof NotConfiguredError ? `✗ ${err.message}` : err);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
