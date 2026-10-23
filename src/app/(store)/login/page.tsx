import type { Metadata } from "next";
import { Suspense } from "react";
import { googleEnabled } from "@/server/auth";
import { PageHero } from "@/components/layout/PageHero";
import { LoginForm } from "@/components/auth/LoginForm";

export const metadata: Metadata = {
  title: "Sign in",
  robots: { index: false, follow: false },
};

export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <>
      <PageHero eyebrow="Your account" title="Sign in" align="center">
        <p className="max-w-md text-muted">No password to remember. We&apos;ll email you a one-time code.</p>
      </PageHero>
      <div className="mx-auto w-full max-w-md px-4 pb-24">
        <Suspense fallback={<div className="surface h-80 animate-pulse" />}>
          <Form searchParams={searchParams} />
        </Suspense>
      </div>
    </>
  );
}

async function Form({ searchParams }: { searchParams: PageProps<"/login">["searchParams"] }) {
  const { next } = await searchParams;
  return <LoginForm next={typeof next === "string" ? next : "/account"} googleEnabled={googleEnabled} />;
}
