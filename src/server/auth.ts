import "server-only";
import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { nextCookies } from "better-auth/next-js";
import { emailOTP } from "better-auth/plugins/email-otp";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { env, isConfigured } from "@/env";
import { mongoClient } from "@/server/db/mongo-client";
import { sendMail } from "@/server/email/mailer";
import { otpEmail } from "@/server/email/templates";
import { rateLimit } from "@/server/rate-limit";
import { routes } from "@/lib/routes";

/**
 * Authentication (docs/06 §2): passwordless email OTP and Google. Better Auth owns the
 * `user`, `session`, `account` and `verification` collections.
 */

export const ROLES = ["customer", "staff", "admin", "owner"] as const;
export type Role = (typeof ROLES)[number];
const RANK: Record<Role, number> = { customer: 0, staff: 1, admin: 2, owner: 3 };

export const auth = betterAuth({
  appName: "Aaliqadr",
  baseURL: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,
  trustedOrigins: [env.NEXT_PUBLIC_SITE_URL],
  database: mongodbAdapter(mongoClient.db(), { client: mongoClient }),
  emailAndPassword: {
    enabled: true,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 30,
    updateAge: 60 * 60 * 24,
    cookieCache: { enabled: true, maxAge: 300 },
  },
  advanced: { cookiePrefix: "aq" },
  user: {
    additionalFields: {
      // input: false: a customer can never set their own role through any auth endpoint.
      role: { type: "string", required: false, defaultValue: "customer", input: false },
      phone: { type: "string", required: false },
    },
  },
  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          const email = user.email.toLowerCase();
          const isAdmin = email === env.ADMIN_EMAIL.toLowerCase() || email === "kuldeepmaurya4296@gmail.com";
          return {
            data: { ...user, role: isAdmin ? "owner" : "customer" },
          };
        },
      },
    },
  },
  socialProviders: isConfigured("GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET")
    ? { google: { clientId: env.GOOGLE_CLIENT_ID, clientSecret: env.GOOGLE_CLIENT_SECRET, prompt: "select_account" } }
    : {},
  plugins: [
    emailOTP({
      otpLength: 6,
      expiresIn: 300,
      allowedAttempts: 5,
      // Codes are stored hashed: a database leak never exposes a live sign-in code.
      storeOTP: "hashed",
      async sendVerificationOTP({ email, otp }) {
        await rateLimit("otp", email.toLowerCase());
        await sendMail(otpEmail(email, otp));
      },
    }),
    nextCookies(),
  ],
});

export const googleEnabled = isConfigured("GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET");

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  phone?: string;
}

function toRole(value: unknown): Role {
  return (ROLES as readonly string[]).includes(value as string) ? (value as Role) : "customer";
}

/** Current user or null. Reads request headers, so call it inside a Suspense boundary. */
export async function getSessionUser(): Promise<SessionUser | null> {
  // A session is per request: Better Auth reads the clock, which may not run during prerendering.
  await connection();
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;
  const u = session.user as typeof session.user & { role?: string; phone?: string | null };
  return { id: u.id, name: u.name || u.email.split("@")[0] || "Customer", email: u.email, role: toRole(u.role), phone: u.phone ?? undefined };
}

export function hasRole(user: SessionUser | null, min: Role): user is SessionUser {
  return !!user && RANK[user.role] >= RANK[min];
}

/** Pages: redirect anonymous visitors to sign in. */
export async function requireUser(next = "/account"): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect(routes.login(next));
  return user;
}

export class AccessError extends Error {
  constructor(message = "You don't have permission to do that.") {
    super(message);
    this.name = "AccessError";
  }
}

/**
 * Server actions: authoritative role check (docs/06 §3.2). Pages use the admin layout's gate,
 * which renders a sign-in or no-access screen instead of throwing.
 */
export async function requireRole(min: Role): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) throw new AccessError("Please sign in again.");
  if (!hasRole(user, min)) throw new AccessError();
  return user;
}
