import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHero } from "@/components/layout/PageHero";
import { ResetPasswordForm } from "@/components/auth/PasswordForms";

export const metadata: Metadata = { title: "Choose a new password", robots: { index: false, follow: false }, referrer: "no-referrer" };

export default function ResetPasswordPage({ searchParams }: PageProps<"/reset-password">) {
  return (
    <>
      <PageHero eyebrow="Your account" title="New password" align="center" />
      <div className="mx-auto w-full max-w-md px-4 pb-24">
        <Suspense fallback={<div className="surface h-72 animate-pulse" />}>
          <Form searchParams={searchParams} />
        </Suspense>
      </div>
    </>
  );
}

async function Form({ searchParams }: { searchParams: PageProps<"/reset-password">["searchParams"] }) {
  const { token, error } = await searchParams;
  if (error) return <p className="surface p-7 text-sm">This reset link has expired or was already used. <a href="/forgot-password" className="underline">Request a new one</a>.</p>;
  return <ResetPasswordForm token={typeof token === "string" ? token.slice(0, 200) : ""} />;
}
