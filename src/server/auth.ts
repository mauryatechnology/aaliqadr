import "server-only";
import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { nextCookies } from "better-auth/next-js";
import { emailOTP } from "better-auth/plugins/email-otp";
import { twoFactor } from "better-auth/plugins";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { env, isConfigured } from "@/env";
import { mongoClient } from "@/server/db/mongo-client";
import { sendMail } from "@/server/email/mailer";
import { otpEmail, passwordResetEmail } from "@/server/email/templates";
import { rateLimit, RateLimitError } from "@/server/rate-limit";
import { isBreachedPassword, passwordProblem } from "@/server/auth-password";
import { routes } from "@/lib/routes";

/**
 * Authentication (docs/06 §2): email OTP, Google, and password sign-in for existing accounts.
 * Better Auth owns the `user`, `session`, `account` and `verification` collections.
 *
 * Accounts are created only by flows that prove the email address (OTP, Google). Password
 * sign-up is closed: a password is set later by a signed-in user or a reset link.
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
    // Open sign-up would let anyone claim ADMIN_EMAIL or an invited address (plan.md S1).
    disableSignUp: true,
    requireEmailVerification: true,
    minPasswordLength: 12,
    maxPasswordLength: 128,
    resetPasswordTokenExpiresIn: 30 * 60,
    revokeSessionsOnPasswordReset: true,
    async sendResetPassword({ user, url }) {
      await sendMail(passwordResetEmail(user.email, url));
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 30,
    updateAge: 60 * 60 * 24,
    // No cookie cache: a role change or revoked session takes effect on the very next request.
    cookieCache: { enabled: false },
  },
  // Per-IP limits shared across instances (stored in MongoDB); per-email limits are in hooks.
  rateLimit: {
    enabled: true,
    storage: "database",
    window: 60,
    max: 100,
    customRules: {
      "/sign-in/email": { window: 15 * 60, max: 10 },
      "/request-password-reset": { window: 60 * 60, max: 5 },
      "/email-otp/send-verification-otp": { window: 60 * 60, max: 10 },
      "/sign-in/email-otp": { window: 15 * 60, max: 10 },
    },
  },
  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      // Every way of choosing a password goes through the same policy.
      const newPassword = typeof ctx.body?.newPassword === "string" ? ctx.body.newPassword : "";
      if (newPassword && ["/change-password", "/reset-password", "/set-password"].includes(ctx.path)) {
        const problem = passwordProblem(newPassword);
        if (problem) throw new APIError("BAD_REQUEST", { message: problem });
        if (await isBreachedPassword(newPassword)) throw new APIError("BAD_REQUEST", { message: "This password has appeared in a data breach. Please choose a different one." });
      }
      const email = typeof ctx.body?.email === "string" ? ctx.body.email.trim().toLowerCase() : "";
      if (!email) return;
      // A deactivated account can't sign in or get a code (plan.md §5).
      if (["/sign-in/email", "/sign-in/email-otp", "/email-otp/send-verification-otp", "/request-password-reset"].includes(ctx.path)) {
        const u = await mongoClient.db().collection("user").findOne({ email }, { projection: { disabled: 1 } });
        if (u?.disabled) throw new APIError("FORBIDDEN", { message: "This account has been deactivated. Please contact us." });
      }
      try {
        if (ctx.path === "/sign-in/email") await rateLimit("login", email);
        if (ctx.path === "/request-password-reset") await rateLimit("passwordReset", email);
      } catch (e) {
        if (e instanceof RateLimitError) throw new APIError("TOO_MANY_REQUESTS", { message: e.message });
        throw e;
      }
    }),
    after: createAuthMiddleware(async (ctx) => {
      // Auth audit log: sign-ins, failures, sign-out, 2FA and password changes (plan.md S8).
      try {
        const ip = ctx.headers?.get("x-forwarded-for")?.split(",")[0]?.trim() || ctx.headers?.get("x-real-ip") || "127.0.0.1";
        const userAgent = ctx.headers?.get("user-agent") || "unknown";
        const coll = mongoClient.db().collection("auditlogs");
        const auditPaths = [
          "/sign-in/email",
          "/sign-in/email-otp",
          "/sign-out",
          "/change-password",
          "/reset-password",
          "/two-factor/enable",
          "/two-factor/disable",
        ];
        if (auditPaths.includes(ctx.path)) {
          const email = typeof ctx.body?.email === "string" ? ctx.body.email.trim().toLowerCase() : "";
          const sessionUser = (ctx.context as { session?: { user?: { id?: string; name?: string; email?: string; role?: string } } })?.session?.user;
          const actorId = sessionUser?.id || email || "visitor";
          const actorName = sessionUser?.name || email || "Visitor";
          const actorRole = sessionUser?.role || "customer";
          const actionMap: Record<string, string> = {
            "/sign-in/email": "auth.sign_in",
            "/sign-in/email-otp": "auth.sign_in",
            "/sign-out": "auth.sign_out",
            "/change-password": "auth.password_change",
            "/reset-password": "auth.password_reset",
            "/two-factor/enable": "auth.2fa_enable",
            "/two-factor/disable": "auth.2fa_disable",
          };
          await coll.insertOne({
            actor: { userId: actorId, name: actorName, role: actorRole },
            action: actionMap[ctx.path] || `auth.${ctx.path.slice(1).replace(/\//g, "_")}`,
            entity: { kind: "auth", id: actorId },
            detail: { ip, userAgent, path: ctx.path },
            createdAt: new Date(),
          });
        }
      } catch {
        // Auth audit is best-effort and never disrupts the auth response
      }
    }),
  },
  advanced: { cookiePrefix: "aq" },
  user: {
    additionalFields: {
      // input: false: a customer can never set their own role through any auth endpoint.
      role: { type: "string", required: false, defaultValue: "customer", input: false },
      phone: { type: "string", required: false },
      // Set from the admin only (plan.md §5).
      disabled: { type: "boolean", required: false, defaultValue: false, input: false },
      codBlocked: { type: "boolean", required: false, defaultValue: false, input: false },
    },
  },
  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          const email = user.email.toLowerCase();
          // Privileged roles only for an address the person has proved they own (OTP or Google);
          // ownership comes from configuration alone, never from code (plan.md S1, S2).
          const verified = user.emailVerified === true;
          const isAdmin = verified && email === env.ADMIN_EMAIL.toLowerCase();
          // A pending staff invite (Settings › Staff) decides the role of a new account.
          const invites = mongoClient.db().collection<{ email: string; role: string; acceptedAt?: Date }>("staffinvites");
          const invite = isAdmin || !verified ? null : await invites.findOne({ email, acceptedAt: { $exists: false } });
          if (invite) await invites.updateOne({ email }, { $set: { acceptedAt: new Date() } });
          return {
            data: { ...user, role: isAdmin ? "owner" : (invite?.role ?? "customer") },
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
    twoFactor({
      issuer: "Aaliqadr",
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
  twoFactorEnabled?: boolean;
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
  const u = session.user as typeof session.user & {
    role?: string;
    phone?: string | null;
    disabled?: boolean | null;
    twoFactorEnabled?: boolean | null;
  };
  if (u.disabled) return null;
  return {
    id: u.id,
    name: u.name || u.email.split("@")[0] || "Customer",
    email: u.email,
    role: toRole(u.role),
    phone: u.phone ?? undefined,
    twoFactorEnabled: Boolean(u.twoFactorEnabled),
  };
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
