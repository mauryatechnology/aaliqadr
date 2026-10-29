import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ChevronRight, LayoutDashboard, ShieldCheck, Sparkles, Package, Compass } from "lucide-react";
import { hasRole, requireUser } from "@/server/auth";
import { listOrdersForUser } from "@/server/queries/account";
import { formatPrice } from "@/lib/money";
import { STATUS_LABEL, type OrderStatus } from "@/lib/order-status";
import { routes } from "@/lib/routes";
import { SignOutButton } from "@/components/auth/SignOutButton";
import { Reveal } from "@/components/motion/Reveal";

export const metadata: Metadata = {
  title: "Patron Account & Orders | Aaliqadr",
  description: "Manage your Aaliqadr patron account, track bespoke fragrance orders, and access your private salon privileges.",
  robots: { index: false, follow: false },
};

const dateFmt = new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeZone: "Asia/Kolkata" });

export default function AccountPage() {
  return (
    <div className="relative overflow-clip bg-[#060508] text-ivory">
      {/* 1. Grand Haute-Parfumerie Patron Hero */}
      <section className="grain relative isolate flex min-h-[42vh] sm:min-h-[48vh] flex-col justify-center items-center overflow-clip pt-28 pb-10 sm:pt-36 sm:pb-14 text-center">
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
              <span>PATRON PROFILE · HOUSE OF AALIQADR · PRIVATE SALON</span>
              <span className="text-[9px]">✦</span>
            </p>
          </Reveal>

          <Reveal delay={0.08}>
            <h1 className="font-display text-4xl sm:text-6xl md:text-7xl font-light leading-[1.05] tracking-tight max-w-3xl text-ivory">
              Welcome to Your{" "}
              <span className="italic font-light text-gold-soft">
                Private Chamber.
              </span>
            </h1>
          </Reveal>

          <Reveal delay={0.16}>
            <p className="mt-4 max-w-xl text-xs sm:text-sm text-ivory/80 font-light leading-relaxed mx-auto">
              Review your bespoke celestial orders, inspect white-glove dispatch status, and manage your maison security credentials.
            </p>
          </Reveal>
        </div>
      </section>

      {/* 2. Main Account Grid */}
      <div className="mx-auto max-w-[1360px] px-4 pb-24 sm:px-6">
        <Suspense
          fallback={
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-[340px_minmax(0,1fr)]">
              <div className="h-80 border border-gold/15 bg-surface/50 animate-pulse" />
              <div className="h-96 border border-gold/15 bg-surface/50 animate-pulse" />
            </div>
          }
        >
          <Content />
        </Suspense>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: OrderStatus }) {
  const label = STATUS_LABEL[status] ?? status;
  if (status === "cancelled" || status === "returned") {
    return (
      <span className="border border-red-500/40 bg-red-500/10 px-2.5 py-0.5 font-caps text-[9px] uppercase tracking-[0.18em] text-red-300 font-medium">
        {label}
      </span>
    );
  }
  if (status === "delivered") {
    return (
      <span className="border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-0.5 font-caps text-[9px] uppercase tracking-[0.18em] text-emerald-300 font-medium">
        {label}
      </span>
    );
  }
  if (status === "shipped") {
    return (
      <span className="border border-sky-500/40 bg-sky-500/10 px-2.5 py-0.5 font-caps text-[9px] uppercase tracking-[0.18em] text-sky-300 font-medium">
        {label}
      </span>
    );
  }
  return (
    <span className="border border-gold/40 bg-gold/10 px-2.5 py-0.5 font-caps text-[9px] uppercase tracking-[0.18em] text-gold font-medium">
      {label}
    </span>
  );
}

async function Content() {
  const user = await requireUser("/account");
  const orders = await listOrdersForUser(user);

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-[340px_minmax(0,1fr)]">
      {/* Left Column: Patron Identity & Navigation Card */}
      <Reveal className="h-fit">
        <aside className="border border-gold/20 bg-surface/60 p-6 sm:p-8 rounded-none backdrop-blur-md shadow-[0_15px_40px_rgba(0,0,0,0.6)]">
          {/* User Avatar Monogram & Details */}
          <div className="flex items-start gap-4 pb-6 border-b border-gold/15">
            <div className="size-12 shrink-0 border border-gold/40 bg-gold/10 flex items-center justify-center text-gold font-display text-xl select-none">
              {user.name ? user.name.charAt(0).toUpperCase() : "✦"}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-display text-2xl font-light text-ivory tracking-wide truncate">
                {user.name}
              </p>
              <p className="text-xs text-gold/90 font-mono tracking-wide break-all mt-0.5">
                {user.email}
              </p>
              <div className="mt-2.5">
                <span className="inline-flex items-center gap-1.5 border border-gold/30 bg-gold/[0.08] px-2.5 py-0.5 font-caps text-[9px] uppercase tracking-[0.2em] text-gold font-medium">
                  ✦ Maison Patron
                </span>
              </div>
            </div>
          </div>

          {/* Quick Action Navigation */}
          <div className="mt-6 flex flex-col gap-3">
            {hasRole(user, "staff") && (
              <Link
                href="/admin"
                className="group flex items-center justify-between border border-gold/40 bg-gold/[0.08] px-4 py-3 font-caps text-xs uppercase tracking-[0.18em] text-gold transition-all duration-300 hover:bg-gold/20 hover:border-gold"
              >
                <span className="flex items-center gap-2.5">
                  <LayoutDashboard className="size-4" aria-hidden />
                  <span>Admin Dashboard</span>
                </span>
                <ChevronRight className="size-3.5 transition-transform group-hover:translate-x-1" />
              </Link>
            )}

            <Link
              href="/account/security"
              className="group flex items-center justify-between border border-line bg-surface/80 px-4 py-3 font-caps text-xs uppercase tracking-[0.18em] text-ivory/90 transition-all duration-300 hover:border-gold hover:text-gold hover:bg-surface"
            >
              <span className="flex items-center gap-2.5">
                <ShieldCheck className="size-4 text-gold/80" aria-hidden />
                <span>Password &amp; Security</span>
              </span>
              <ChevronRight className="size-3.5 text-muted transition-transform group-hover:translate-x-1 group-hover:text-gold" />
            </Link>

            <Link
              href="/find-my-sign"
              className="group flex items-center justify-between border border-line bg-surface/80 px-4 py-3 font-caps text-xs uppercase tracking-[0.18em] text-ivory/90 transition-all duration-300 hover:border-gold hover:text-gold hover:bg-surface"
            >
              <span className="flex items-center gap-2.5">
                <Compass className="size-4 text-gold/80" aria-hidden />
                <span>Find My Sign Calculator</span>
              </span>
              <ChevronRight className="size-3.5 text-muted transition-transform group-hover:translate-x-1 group-hover:text-gold" />
            </Link>

            <Link
              href="/shop"
              className="group flex items-center justify-between border border-line bg-surface/80 px-4 py-3 font-caps text-xs uppercase tracking-[0.18em] text-ivory/90 transition-all duration-300 hover:border-gold hover:text-gold hover:bg-surface"
            >
              <span className="flex items-center gap-2.5">
                <Sparkles className="size-4 text-gold/80" aria-hidden />
                <span>Browse All Fragrances</span>
              </span>
              <ChevronRight className="size-3.5 text-muted transition-transform group-hover:translate-x-1 group-hover:text-gold" />
            </Link>
          </div>

          {/* Sign Out Button */}
          <div className="mt-8 pt-6 border-t border-gold/15">
            <SignOutButton className="font-caps text-[11px] uppercase tracking-[0.2em] text-muted hover:text-gold transition-colors" />
          </div>
        </aside>
      </Reveal>

      {/* Right Column: Order History Section */}
      <Reveal delay={0.1}>
        <section
          className="border border-gold/20 bg-surface/60 p-6 sm:p-8 rounded-none backdrop-blur-md shadow-[0_15px_40px_rgba(0,0,0,0.6)]"
          aria-labelledby="orders-h"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-5 border-b border-gold/15">
            <div>
              <p className="eyebrow text-gold font-medium tracking-[0.22em] mb-1">
                Order History
              </p>
              <h2 id="orders-h" className="font-display text-2xl sm:text-3xl font-light text-ivory">
                Your Orders &amp; Dispatches
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <span className="size-1.5 rounded-full bg-gold animate-pulse" />
              <span className="font-caps text-[10px] uppercase tracking-[0.2em] text-ivory/80">
                {orders.length} {orders.length === 1 ? "Order Recorded" : "Orders Recorded"}
              </span>
            </div>
          </div>

          {orders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center border border-dashed border-gold/15 bg-surface/30 mt-6 p-8">
              <Package className="size-10 text-gold/60 mb-3" />
              <h3 className="font-display text-2xl text-ivory font-light italic mb-2">
                No orders placed yet
              </h3>
              <p className="text-xs sm:text-sm text-ivory/70 max-w-md mb-6 leading-relaxed font-light">
                Your first celestial Extrait de Parfum signature is waiting. Discover the fragrance composed for your constellation.
              </p>
              <Link
                href="/shop"
                className="border border-gold/40 bg-gold/10 px-6 py-2.5 font-caps text-[11px] uppercase tracking-[0.22em] text-gold hover:bg-gold/20 transition-all"
              >
                Explore Fragrances
              </Link>
            </div>
          ) : (
            <ul className="mt-6 flex flex-col gap-4">
              {orders.map((o) => (
                <li key={o._id}>
                  <Link
                    href={routes.accountOrder(o._id)}
                    className="group flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-line/80 bg-surface/80 p-5 rounded-none transition-all duration-300 hover:border-gold/50 hover:bg-surface hover:shadow-[0_8px_25px_rgba(0,0,0,0.5)]"
                  >
                    {/* Left: Order ID, Date, Items Line */}
                    <div className="flex flex-1 flex-col gap-1.5">
                      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                        <span className="font-caps text-xs uppercase tracking-[0.18em] text-gold font-medium">
                          {o._id}
                        </span>
                        <span className="text-xs text-ivory/70 font-light">
                          · {dateFmt.format(new Date(o.createdAt))}
                        </span>
                      </div>

                      {/* Items Line: MAXIMUM READABILITY with clear text-ivory */}
                      <p className="text-sm sm:text-base font-light text-ivory tracking-wide line-clamp-1 group-hover:text-gold-soft transition-colors">
                        {o.items.map((i) => `${i.name} × ${i.qty}`).join(", ")}
                      </p>
                    </div>

                    {/* Right: Total Price, Status Badge, Arrow */}
                    <div className="flex items-center justify-between sm:justify-end gap-5 shrink-0 pt-2 sm:pt-0 border-t border-line/40 sm:border-t-0">
                      <div className="flex flex-col items-start sm:items-end gap-1">
                        <span className="font-display text-xl text-ivory font-light">
                          {formatPrice(o.pricing.totalP)}
                        </span>
                        <StatusBadge status={o.status} />
                      </div>
                      <ChevronRight className="size-4 text-gold/60 transition-transform duration-300 group-hover:translate-x-1.5 group-hover:text-gold" />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </Reveal>
    </div>
  );
}
