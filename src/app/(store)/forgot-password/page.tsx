import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHero } from "@/components/layout/PageHero";
import { ForgotPasswordForm } from "@/components/auth/PasswordForms";

export const metadata: Metadata = { title: "Forgot password", robots: { index: false, follow: false } };

export default function ForgotPasswordPage({ searchParams }: PageProps<"/forgot-password">) {
  return (
    <>
      <PageHero eyebrow="Your account" title="Forgot password" align="center">
        <p className="max-w-md text-muted">We&apos;ll email you a link to choose a new one.</p>
      </PageHero>
      <div className="mx-auto w-full max-w-md px-4 pb-24">
        <Suspense fallback={<div className="surface h-64 animate-pulse" />}>
          <Form searchParams={searchParams} />
        </Suspense>
      </div>
    </>
  );
}

async function Form({ searchParams }: { searchParams: PageProps<"/forgot-password">["searchParams"] }) {
  const { email } = await searchParams;
  return <ForgotPasswordForm initialEmail={typeof email === "string" ? email.slice(0, 254) : ""} />;
}
