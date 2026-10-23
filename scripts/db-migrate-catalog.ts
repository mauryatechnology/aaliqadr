/**
 * Adds categories, collections and the HSN master, and upgrades existing products to the
 * options/media model. Idempotent; safe to run repeatedly.
 *   npm run db:migrate-catalog
 */
import mongoose from "mongoose";
import { NotConfiguredError } from "@/env";
import { migrateCatalog } from "@/server/catalog/migrate";

migrateCatalog()
  .catch((err: unknown) => {
    console.error(err instanceof NotConfiguredError ? `✗ ${err.message}` : err);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
