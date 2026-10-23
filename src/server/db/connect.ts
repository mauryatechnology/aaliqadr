import "server-only";
import mongoose from "mongoose";
import { attachDatabasePool } from "@vercel/functions";
import { env, isConfigured, requireConfigured } from "@/env";

type Cache = { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null };
const g = globalThis as unknown as { __aqMongoose?: Cache };
const cache: Cache = (g.__aqMongoose ??= { conn: null, promise: null });

mongoose.set("strictQuery", true);
// Not `sanitizeFilter`: it also wraps our own operators ($gte, $elemMatch, $expr) in $eq, which
// silently breaks conditional stock and coupon updates. Operator injection is prevented at the
// boundary instead: every user value is Zod-parsed to a primitive before it reaches a query.

export const isDatabaseConfigured = () => isConfigured("MONGODB_URI");

/** Cached, serverless-safe connection (docs/04 §2). Throws a clear error while the URI is a placeholder. */
export async function db(): Promise<typeof mongoose> {
  if (cache.conn) return cache.conn;
  requireConfigured("MONGODB_URI");
  cache.promise ??= mongoose
    .connect(env.MONGODB_URI, {
      maxPoolSize: 10,
      minPoolSize: 0,
      maxIdleTimeMS: 60_000,
      serverSelectionTimeoutMS: 5_000,
      socketTimeoutMS: 20_000,
      autoIndex: env.NODE_ENV !== "production",
      bufferCommands: false,
    })
    .then((m) => {
      // Fluid compute: release idle connections before the instance suspends.
      attachDatabasePool(m.connection.getClient());
      return m;
    })
    .catch((err) => {
      cache.promise = null;
      throw err;
    });
  cache.conn = await cache.promise;
  return cache.conn;
}
