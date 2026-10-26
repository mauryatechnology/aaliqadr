import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { Suspense } from "react";
import { ArrowLeft } from "lucide-react";
import { auth, requireUser } from "@/server/auth";
import { hasPasswordAccount } from "@/server/queries/account";
import { PageHero } from "@/components/layout/PageHero";
import { AccountPasswordForm } from "@/components/auth/PasswordForms";
import { SessionsList } from "@/components/auth/SessionsList";
import { TwoFactorCard } from "@/components/auth/TwoFactorCard";

export const metadata: Metadata = { title: "Security", robots: { index: false, follow: false } };

export default function SecurityPage() {
  return (
    <>
      <PageHero eyebrow="Your account" title="Security">
        <Link href="/account" className="flex items-center gap-2 text-sm text-muted hover:text-fg"><ArrowLeft className="size-4" /> Account</Link>
      </PageHero>
      <div className="mx-auto max-w-[1360px] px-4 pb-24 sm:px-6">
        <Suspense fallback={<div className="surface h-96 animate-pulse" />}>
          <Content />
        </Suspense>
      </div>
    </>
  );
}

async function Content() {
  const user = await requireUser("/account/security");
  const [hasPassword, session] = await Promise.all([hasPasswordAccount(user.id), auth.api.getSession({ headers: await headers() })]);
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <TwoFactorCard initiallyEnabled={Boolean(user.twoFactorEnabled)} hasPassword={hasPassword} />
      <section className="surface flex flex-col gap-4 p-6 sm:p-8" aria-labelledby="pw-h">
        <div>
          <h2 id="pw-h" className="font-display text-3xl">{hasPassword ? "Change password" : "Set a password"}</h2>
          <p className="mt-1 text-sm text-muted">{hasPassword ? "Changing it signs you out on every other device." : "Optional: you can always sign in with a one-time email code instead."}</p>
        </div>
        <AccountPasswordForm hasPassword={hasPassword} />
      </section>
      <section className="surface flex flex-col gap-4 p-6 sm:p-8 lg:col-span-2" aria-labelledby="sess-h">
        <div>
          <h2 id="sess-h" className="font-display text-3xl">Where you&apos;re signed in</h2>
          <p className="mt-1 text-sm text-muted">Don&apos;t recognise a device? Sign it out, then change your password.</p>
        </div>
        <SessionsList currentToken={session?.session.token ?? ""} />
      </section>
    </div>
  );
}
