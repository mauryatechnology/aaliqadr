import "server-only";
import { z } from "zod";

/**
 * Server environment, validated once at import.
 *
 * Every variable must be *present* (no silent fallbacks, see docs/06 §9). Values starting with
 * "dummy" are explicit placeholders: they let the app run locally before integrations are set
 * up, but a Vercel production deploy refuses to boot with any placeholder left.
 */

const PLACEHOLDER = /^dummy/i;

export function isPlaceholder(value: string | undefined): boolean {
  return !value || PLACEHOLDER.test(value) || value.includes("dummy-");
}

const str = z.string().trim().min(1);

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  VERCEL_ENV: z.enum(["development", "preview", "production"]).optional(),

  NEXT_PUBLIC_SITE_URL: z.url(),

  MONGODB_URI: str,

  BETTER_AUTH_SECRET: z.string().min(32, "Use at least 32 random characters (openssl rand -base64 32)"),
  BETTER_AUTH_URL: z.url(),
  GOOGLE_CLIENT_ID: str,
  GOOGLE_CLIENT_SECRET: str,

  ENCRYPTION_KEY: str,

  RAZORPAY_KEY_ID: str,
  RAZORPAY_KEY_SECRET: str,
  RAZORPAY_WEBHOOK_SECRET: str,
  NEXT_PUBLIC_RAZORPAY_KEY_ID: str,

  SHIPROCKET_EMAIL: str,
  SHIPROCKET_PASSWORD: str,
  SHIPROCKET_WEBHOOK_TOKEN: str,
  SHIPROCKET_PICKUP_LOCATION: str,

  BLOB_READ_WRITE_TOKEN: str,
  BLOB_PRIVATE_READ_WRITE_TOKEN: str,

  UPSTASH_REDIS_REST_URL: z.url(),
  UPSTASH_REDIS_REST_TOKEN: str,

  SMTP_HOST: str,
  SMTP_PORT: z.coerce.number().int().positive(),
  SMTP_USER: str,
  SMTP_PASS: str,
  EMAIL_FROM: str,
  SUPPORT_EMAIL: z.email(),
  /** Signs in as owner the first time (docs/06 §3); everyone else starts as a customer. */
  ADMIN_EMAIL: z.email(),

  MSG91_AUTH_KEY: str,
  MSG91_OTP_TEMPLATE_ID: str,
  MSG91_SENDER_ID: str,

  CRON_SECRET: str,

  SENTRY_DSN: str,
  NEXT_PUBLIC_SENTRY_DSN: str,
});

export type Env = z.infer<typeof schema>;
export type EnvKey = keyof Env;

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  const missing = parsed.error.issues.map((i) => `  • ${i.path.join(".")}: ${i.message}`).join("\n");
  throw new Error(`Invalid environment variables (see .env.example):\n${missing}`);
}

export const env: Env = parsed.data;

/** Optional integrations may stay placeholders in production until they are switched on. */
const OPTIONAL_IN_PRODUCTION: EnvKey[] = [
  "SENTRY_DSN",
  "NEXT_PUBLIC_SENTRY_DSN",
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  // Shipping falls back to manual courier + AWB entry in admin.
  "SHIPROCKET_EMAIL",
  "SHIPROCKET_PASSWORD",
  "SHIPROCKET_WEBHOOK_TOKEN",
  "SHIPROCKET_PICKUP_LOCATION",
  // Phone OTP stays off until DLT templates are approved; email OTP and Google work.
  "MSG91_AUTH_KEY",
  "MSG91_OTP_TEMPLATE_ID",
  "MSG91_SENDER_ID",
  // Invoices are rendered on demand, so the private store is only needed for uploads.
  "BLOB_PRIVATE_READ_WRITE_TOKEN",
];

if (env.VERCEL_ENV === "production") {
  const placeholders = (Object.keys(env) as EnvKey[]).filter(
    (k) => typeof env[k] === "string" && !OPTIONAL_IN_PRODUCTION.includes(k) && isPlaceholder(env[k] as string),
  );
  if (placeholders.length) {
    throw new Error(`Production deploy has placeholder env values: ${placeholders.join(", ")}`);
  }
}

/** True when the given integration has a real value (not a "dummy" placeholder). */
export function isConfigured(...keys: EnvKey[]): boolean {
  return keys.every((k) => !isPlaceholder(env[k] as string | undefined));
}

export class NotConfiguredError extends Error {
  constructor(public readonly keys: EnvKey[]) {
    super(`Not configured yet: set ${keys.join(", ")} in .env (currently placeholders).`);
    this.name = "NotConfiguredError";
  }
}

/** Throws a clear error when an integration is used before its env values are filled in. */
export function requireConfigured(...keys: EnvKey[]): void {
  const missing = keys.filter((k) => isPlaceholder(env[k] as string | undefined));
  if (missing.length) throw new NotConfiguredError(missing);
}
