import "server-only";
import { MongoClient } from "mongodb";
import { attachDatabasePool } from "@vercel/functions";
import { env, isPlaceholder } from "@/env";

/**
 * Raw MongoDB driver client for Better Auth's adapter (the app's own models use Mongoose,
 * server/db/connect.ts). Connects lazily on first use; one small pool per instance.
 */
const g = globalThis as unknown as { __aqMongoClient?: MongoClient };

// While the URI is a placeholder (local seed mode, CI builds) the client points at an unreachable
// address: it only connects on first use, so builds and pages that never touch auth still work.
const uri = isPlaceholder(env.MONGODB_URI) ? "mongodb://127.0.0.1:1/placeholder" : env.MONGODB_URI;

export const mongoClient: MongoClient = (g.__aqMongoClient ??= new MongoClient(uri, {
  maxPoolSize: 5,
  maxIdleTimeMS: 60_000,
  serverSelectionTimeoutMS: 5_000,
}));

attachDatabasePool(mongoClient);
