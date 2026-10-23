import "server-only";
import { MongoClient } from "mongodb";
import { attachDatabasePool } from "@vercel/functions";
import { env } from "@/env";

/**
 * Raw MongoDB driver client for Better Auth's adapter (the app's own models use Mongoose,
 * server/db/connect.ts). Connects lazily on first use; one small pool per instance.
 */
const g = globalThis as unknown as { __aqMongoClient?: MongoClient };

export const mongoClient: MongoClient = (g.__aqMongoClient ??= new MongoClient(env.MONGODB_URI, {
  maxPoolSize: 5,
  maxIdleTimeMS: 60_000,
  serverSelectionTimeoutMS: 5_000,
}));

attachDatabasePool(mongoClient);
