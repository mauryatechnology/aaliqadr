import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { Suspense } from "react";
import { ArrowLeft } from "lucide-react";
import { auth, requireUser } from "@/server/auth";
import { hasPasswordAccount } from "@/server/queries/account";
import { AccountPasswordForm } from "@/components/auth/PasswordForms";
import { SessionsList } from "@/components/auth/SessionsList";
import { TwoFactorCard } from "@/components/auth/TwoFactorCard";
import { Reveal } from "@/components/motion/Reveal";

export const metadata: Metadata = {
  title: "Account Security & Authentication | Aaliqadr",
  description: "Manage your Aaliqadr security credentials, two-factor authentication, and active sessions.",
  robots: { index: false, follow: false },
};

export default function SecurityPage() {
  return (
    <div className="relative overflow-clip bg-[#060508] text-ivory">
      {/* 1. Grand Haute-Parfumerie Security Hero */}
      <section className="grain relative isolate flex min-h-[40vh] sm:min-h-[46vh] flex-col justify-center items-center overflow-clip pt-28 pb-10 sm:pt-36 sm:pb-12 text-center">
        {/* Soft cosmic starlight radial nebula glow */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 flex items-center justify-center overflow-hidden"
        >
          <div
            className="absolute h-[480px] w-[480px] sm:h-[600px] sm:w-[600px] rounded-full blur-[130px]"
            style={{
              background:
                "radial-gradient(circle, rgba(201,169,110,0.18) 0%, rgba(45,70,120,0.10) 50%, transparent 70%)",
            }}
          />
        </div>

        <div className="mx-auto flex w-full max-w-[1280px] flex-col items-center px-4 sm:px-6">
          <Reveal>
            <p className="eyebrow flex items-center justify-center gap-2 text-gold font-medium tracking-[0.28em] mb-3 sm:mb-4">
              <span className="text-[9px]">✦</span>
              <span>PATRON SECURITY · HOUSE OF AALIQADR · PRIVACY GUARANTEE</span>
              <span className="text-[9px]">✦</span>
            </p>
          </Reveal>

          <Reveal delay={0.08}>
            <h1 className="font-display text-4xl sm:text-6xl md:text-7xl font-light leading-[1.05] tracking-tight max-w-3xl text-ivory">
              Credentials &amp;{" "}
              <span className="italic font-light text-gold-soft">
                Security.
              </span>
            </h1>
          </Reveal>

          {/* Breadcrumb Back Link */}
          <Reveal delay={0.16} className="mt-6">
            <Link
              href="/account"
              className="inline-flex items-center gap-2 border border-line bg-surface/50 px-4 py-1.5 font-caps text-[10px] uppercase tracking-[0.22em] text-ivory/80 transition-all duration-300 hover:border-gold hover:text-gold"
            >
              <ArrowLeft className="size-3 text-gold" /> Back to Account Profile
            </Link>
          </Reveal>
        </div>
      </section>

      {/* 2. Main Security Form Grid */}
      <div className="mx-auto max-w-[1360px] px-4 pb-24 sm:px-6">
        <Suspense
          fallback={
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div className="h-80 border border-gold/15 bg-surface/50 animate-pulse" />
              <div className="h-80 border border-gold/15 bg-surface/50 animate-pulse" />
            </div>
          }
        >
          <Content />
        </Suspense>
      </div>
    </div>
  );
}

async function Content() {
  const user = await requireUser("/account/security");
  const [hasPassword, session] = await Promise.all([
    hasPasswordAccount(user.id),
    auth.api.getSession({ headers: await headers() }),
  ]);

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <Reveal>
        <div className="border border-gold/20 bg-surface/60 p-6 sm:p-8 rounded-none backdrop-blur-md shadow-[0_15px_40px_rgba(0,0,0,0.6)] h-full">
          <TwoFactorCard initiallyEnabled={Boolean(user.twoFactorEnabled)} hasPassword={hasPassword} />
        </div>
      </Reveal>

      <Reveal delay={0.08}>
        <section
          className="border border-gold/20 bg-surface/60 flex flex-col gap-5 p-6 sm:p-8 rounded-none backdrop-blur-md shadow-[0_15px_40px_rgba(0,0,0,0.6)] h-full"
          aria-labelledby="pw-h"
        >
          <div className="pb-4 border-b border-gold/15">
            <h2 id="pw-h" className="font-display text-2xl sm:text-3xl font-light text-ivory">
              {hasPassword ? "Change Password" : "Set a Password"}
            </h2>
            <p className="mt-1.5 text-xs sm:text-sm text-ivory/70 font-light leading-relaxed">
              {hasPassword
                ? "Changing your password revokes authentication tokens across every other connected session."
                : "Optional: you may also sign in using a private one-time email code anytime."}
            </p>
          </div>
          <AccountPasswordForm hasPassword={hasPassword} />
        </section>
      </Reveal>

      <Reveal delay={0.16} className="lg:col-span-2">
        <section
          className="border border-gold/20 bg-surface/60 flex flex-col gap-5 p-6 sm:p-8 rounded-none backdrop-blur-md shadow-[0_15px_40px_rgba(0,0,0,0.6)]"
          aria-labelledby="sess-h"
        >
          <div className="pb-4 border-b border-gold/15">
            <h2 id="sess-h" className="font-display text-2xl sm:text-3xl font-light text-ivory">
              Active Authorized Sessions
            </h2>
            <p className="mt-1.5 text-xs sm:text-sm text-ivory/70 font-light leading-relaxed">
              If you detect an unfamiliar browser or device, terminate the session immediately and rotate your password.
            </p>
          </div>
          <SessionsList currentToken={session?.session.token ?? ""} />
        </section>
      </Reveal>
    </div>
  );
}
