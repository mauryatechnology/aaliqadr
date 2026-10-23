import "server-only";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { env, isConfigured } from "@/env";

/**
 * Sliding-window rate limits (docs/06 §7). Upstash when configured, so limits hold across
 * serverless instances; until then an in-memory window per instance (good for development,
 * not a defence in production, where env.ts requires Upstash).
 */

export const LIMITS = {
  otp: { max: 5, windowS: 60 * 60 },
  checkout: { max: 10, windowS: 10 * 60 },
  coupon: { max: 10, windowS: 10 * 60 },
  publicWrite: { max: 5, windowS: 60 },
  admin: { max: 120, windowS: 60 },
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
    let rl = limiters.get(name);
    if (!rl) {
      rl = new Ratelimit({ redis: upstash, limiter: Ratelimit.slidingWindow(max, `${windowS} s`), prefix: `aq:rl:${name}` });
      limiters.set(name, rl);
    }
    const { success } = await rl.limit(key);
    if (!success) throw new RateLimitError();
    return;
  }
  const now = Date.now();
  const k = `${name}:${key}`;
  const hits = (memory.get(k) ?? []).filter((t) => now - t < windowS * 1000);
  if (hits.length >= max) throw new RateLimitError();
  hits.push(now);
  memory.set(k, hits);
  if (memory.size > 5000) memory.clear();
}
