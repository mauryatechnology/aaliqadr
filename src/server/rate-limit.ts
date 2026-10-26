import "server-only";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { env, isConfigured } from "@/env";
import { mongoClient } from "@/server/db/mongo-client";

/**
 * Rate limits (docs/06 §7). Upstash sliding windows when configured; otherwise a fixed-window
 * counter in MongoDB, which still holds across serverless instances. Memory is the last resort
 * (database unreachable), so a limit is never silently skipped.
 */

export const LIMITS = {
  otp: { max: 5, windowS: 60 * 60 },
  checkout: { max: 10, windowS: 10 * 60 },
  coupon: { max: 10, windowS: 10 * 60 },
  publicWrite: { max: 5, windowS: 60 },
  admin: { max: 120, windowS: 60 },
  /** Password sign-in per email address (the per-IP limit is Better Auth's). */
  login: { max: 5, windowS: 15 * 60 },
  passwordReset: { max: 3, windowS: 60 * 60 },
  /** Find My Sign and other public tools, per IP. */
  publicTool: { max: 30, windowS: 60 },
  /** Search-as-you-type, per IP (debounced in the browser, so this is generous). */
  search: { max: 120, windowS: 60 },
} as const;

export type LimitName = keyof typeof LIMITS;

const upstash = isConfigured("UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_TOKEN")
  ? new Redis({ url: env.UPSTASH_REDIS_REST_URL, token: env.UPSTASH_REDIS_REST_TOKEN })
  : null;

const limiters = new Map<LimitName, Ratelimit>();
const memory = new Map<string, number[]>();

export class RateLimitError extends Error {
  constructor() {
    super("Too many attempts. Please wait a little and try again.");
    this.name = "RateLimitError";
  }
}

export async function rateLimit(name: LimitName, key: string): Promise<void> {
  const { max, windowS } = LIMITS[name];
  if (upstash) {
    try {
      let rl = limiters.get(name);
      if (!rl) {
        rl = new Ratelimit({ redis: upstash, limiter: Ratelimit.slidingWindow(max, `${windowS} s`), prefix: `aq:rl:${name}` });
        limiters.set(name, rl);
      }
      const { success } = await rl.limit(key);
      if (!success) throw new RateLimitError();
      return;
    } catch (err) {
      if (err instanceof RateLimitError) throw err;
      console.warn(`Upstash rate limiting unavailable (${(err as Error).message}), falling back to in-memory.`);
    }
  }
  try {
    await mongoWindow(name, key, max, windowS);
    return;
  } catch (err) {
    if (err instanceof RateLimitError) throw err;
    console.warn(`Database rate limiting unavailable (${(err as Error).message}), falling back to in-memory.`);
  }
  const now = Date.now();
  const k = `${name}:${key}`;
  const hits = (memory.get(k) ?? []).filter((t) => now - t < windowS * 1000);
  if (hits.length >= max) throw new RateLimitError();
  hits.push(now);
  memory.set(k, hits);
  if (memory.size > 5000) memory.clear();
}

let ttlIndexReady: Promise<unknown> | null = null;

/** Fixed window: one counter document per key per window, expired by a TTL index. */
async function mongoWindow(name: LimitName, key: string, max: number, windowS: number) {
  const col = mongoClient.db().collection<{ _id: string; n: number; expireAt: Date }>("ratelimits");
  ttlIndexReady ??= col.createIndex({ expireAt: 1 }, { expireAfterSeconds: 0 }).catch(() => (ttlIndexReady = null));
  const bucket = Math.floor(Date.now() / (windowS * 1000));
  const doc = await col.findOneAndUpdate(
    { _id: `${name}:${key}:${bucket}` },
    { $inc: { n: 1 }, $setOnInsert: { expireAt: new Date((bucket + 1) * windowS * 1000) } },
    { upsert: true, returnDocument: "after" },
  );
  if ((doc?.n ?? 1) > max) throw new RateLimitError();
}
