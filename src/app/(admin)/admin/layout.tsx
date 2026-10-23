import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ExternalLink, Lock } from "lucide-react";
import { getSessionUser, hasRole } from "@/server/auth";
import { routes } from "@/lib/routes";
import { Logo } from "@/components/brand/Logo";
import { AdminNav } from "@/components/admin/AdminNav";
import { SignOutButton } from "@/components/auth/SignOutButton";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s · Aaliqadr Admin" },
  robots: { index: false, follow: false },
};

/** Back office (docs/11): light, plain and fast. No storefront chrome or animation. */
export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <div className="min-h-dvh bg-neutral-100 font-sans text-neutral-900 [color-scheme:light]">
      <Suspense fallback={<Skeleton />}>
        <Gate>{children}</Gate>
      </Suspense>
    </div>
  );
}

async function Gate({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) {
    return (
      <Centered title="Sign in to the admin" body="Use the email address that has staff access.">
        <Link href={routes.login("/admin")} className="inline-flex h-10 items-center rounded-lg bg-neutral-900 px-5 text-sm font-medium text-white">
          Sign in
        </Link>
      </Centered>
    );
  }
  const email = user.email;
  if (!hasRole(user, "staff")) {
    return (
      <Centered title="No admin access" body={`${email} is a customer account. Ask the store owner to give you a staff role.`}>
        <Link href="/" className="text-sm font-medium underline underline-offset-4">
          Back to the store
        </Link>
      </Centered>
    );
  }
  const role = user.role === "customer" ? "staff" : user.role;
  return (
    <div className="mx-auto grid max-w-[1500px] grid-cols-1 gap-6 px-4 py-4 lg:grid-cols-[230px_minmax(0,1fr)] lg:px-6 lg:py-6">
      <aside className="flex flex-col gap-5 lg:sticky lg:top-6 lg:h-[calc(100dvh-3rem)]">
        <div className="flex items-center justify-between gap-3 lg:flex-col lg:items-start">
          <Link href="/admin" className="flex items-center gap-2 text-neutral-900" aria-label="Admin home">
            <Logo variant="mark" className="h-8 w-auto text-gold-deep" title="Aaliqadr" />
            <span className="text-sm font-semibold tracking-[0.2em]">ADMIN</span>
          </Link>
          <AdminNav role={role} />
        </div>
        <div className="mt-auto hidden flex-col gap-3 border-t border-neutral-200 pt-4 text-sm lg:flex">
          <div>
            <p className="font-medium">{user.name}</p>
            <p className="truncate text-xs text-neutral-500">
              {user.email} · {user.role}
            </p>
          </div>
          <Link href="/" className="flex items-center gap-2 text-neutral-600 hover:text-neutral-900">
            <ExternalLink className="size-4" aria-hidden /> View store
          </Link>
          <SignOutButton className="text-neutral-600 hover:text-neutral-900" />
        </div>
      </aside>
      <main className="min-w-0 pb-16">{children}</main>
    </div>
  );
}

function Centered({ title, body, children }: { title: string; body: string; children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh place-items-center px-4">
      <div className="flex max-w-sm flex-col items-center gap-4 rounded-2xl border border-neutral-200 bg-white p-8 text-center shadow-sm">
        <Lock className="size-6 text-neutral-500" aria-hidden />
        <h1 className="text-xl font-semibold">{title}</h1>
        <p className="text-sm text-neutral-600">{body}</p>
        {children}
      </div>
    </div>
  );
}

function Skeleton() {
  return (
    <div className="mx-auto grid max-w-[1500px] grid-cols-1 gap-6 px-6 py-6 lg:grid-cols-[230px_1fr]">
      <div className="h-64 animate-pulse rounded-xl bg-neutral-200" />
      <div className="h-96 animate-pulse rounded-xl bg-neutral-200" />
    </div>
  );
}
