import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ChevronRight, LayoutDashboard, ShieldCheck } from "lucide-react";
import { hasRole, requireUser } from "@/server/auth";
import { listOrdersForUser } from "@/server/queries/account";
import { formatPrice } from "@/lib/money";
import { STATUS_LABEL } from "@/lib/order-status";
import { routes } from "@/lib/routes";
import { PageHero } from "@/components/layout/PageHero";
import { SignOutButton } from "@/components/auth/SignOutButton";

export const metadata: Metadata = { title: "Your account", robots: { index: false, follow: false } };

const dateFmt = new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeZone: "Asia/Kolkata" });

export default function AccountPage() {
  return (
    <>
      <PageHero eyebrow="Your account" title="Hello" />
      <div className="mx-auto max-w-[1360px] px-4 pb-24 sm:px-6">
        <Suspense fallback={<div className="surface h-96 animate-pulse" />}>
          <Content />
        </Suspense>
      </div>
    </>
  );
}

async function Content() {
  const user = await requireUser("/account");
  const orders = await listOrdersForUser(user);
  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_2fr]">
      <aside className="surface flex h-fit flex-col gap-4 p-6">
        <div>
          <p className="font-display text-3xl">{user.name}</p>
          <p className="text-sm text-muted">{user.email}</p>
        </div>
        {hasRole(user, "staff") && (
          <Link href="/admin" className="flex items-center gap-2 rounded-xl border border-gold/40 px-4 py-3 text-sm text-gold hover:bg-gold/10">
            <LayoutDashboard className="size-4" aria-hidden /> Admin dashboard
          </Link>
        )}
        <Link href="/account/security" className="flex items-center gap-2 rounded-xl border border-white/15 px-4 py-3 text-sm hover:border-gold/60">
          <ShieldCheck className="size-4" aria-hidden /> Password &amp; security
        </Link>
        <SignOutButton />
      </aside>
      <section className="surface flex flex-col p-6" aria-labelledby="orders-h">
        <h2 id="orders-h" className="mb-4 font-display text-3xl">
          Your orders
        </h2>
        {orders.length === 0 ? (
          <div className="flex flex-col items-start gap-4 py-6">
            <p className="text-muted">No orders yet. Your first signature is waiting.</p>
            <Link href="/find-my-sign" className="rounded-full bg-gold px-6 py-3 font-caps text-xs uppercase tracking-[0.22em] text-obsidian">
              Find my sign
            </Link>
          </div>
        ) : (
          <ul className="flex flex-col divide-y divide-white/10">
            {orders.map((o) => (
              <li key={o._id}>
                <Link href={routes.accountOrder(o._id)} className="flex items-center gap-4 py-4 hover:bg-white/[0.03]">
                  <div className="flex flex-1 flex-col gap-1">
                    <span className="font-medium">
                      {o._id} <span className="text-sm font-normal text-muted">· {dateFmt.format(new Date(o.createdAt))}</span>
                    </span>
                    <span className="line-clamp-1 text-sm text-muted">{o.items.map((i) => `${i.name} × ${i.qty}`).join(", ")}</span>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span>{formatPrice(o.pricing.totalP)}</span>
                    <span className="text-xs text-muted">{STATUS_LABEL[o.status]}</span>
                  </div>
                  <ChevronRight className="size-4 text-muted" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
