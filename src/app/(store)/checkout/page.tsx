import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { getSessionUser } from "@/server/auth";
import { getAddresses } from "@/server/queries/account";
import { getSettings } from "@/server/services/settings";
import { CheckoutForm, type SavedAddress } from "@/components/checkout/CheckoutForm";
import { Reveal } from "@/components/motion/Reveal";

export const metadata: Metadata = {
  title: "Secure Checkout | Aaliqadr",
  robots: { index: false, follow: false },
};

export default function CheckoutPage() {
  return (
    <div className="relative overflow-clip bg-[#060508] text-ivory">
      {/* ── 1. ULTRA-LUXURY BLACK HERO ── */}
      <section className="relative isolate flex min-h-[38vh] sm:min-h-[44vh] flex-col justify-center items-center overflow-clip pt-28 pb-10 sm:pt-36 sm:pb-12 text-center bg-[#060508]">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 flex items-center justify-center overflow-hidden"
        >
          <div className="absolute h-[450px] w-[450px] rounded-full bg-gold/[0.10] blur-[140px]" />
          <div className="absolute inset-0 bg-[radial-gradient(#C9A96E_1px,transparent_1px)] [background-size:72px_72px] opacity-15" />
        </div>

        <div className="mx-auto flex w-full max-w-[1200px] flex-col items-center px-4 sm:px-6">
          <Reveal>
            <p className="font-caps text-xs sm:text-[13px] tracking-[0.28em] text-gold font-medium mb-3 sm:mb-4 flex items-center justify-center gap-2">
              <span className="text-[9px]">✦</span>
              <span>CONFIDENTIAL DISPATCH · 256-BIT ENCRYPTION</span>
              <span className="text-[9px]">✦</span>
            </p>
          </Reveal>

          <Reveal delay={0.08}>
            <h1 className="font-display text-4xl sm:text-6xl font-light leading-[1.05] tracking-tight max-w-4xl text-ivory">
              Secure Checkout.{" "}
              <span className="italic font-light text-[#E0C892]">
                White-glove delivery.
              </span>
            </h1>
          </Reveal>
        </div>
      </section>

      {/* ── 2. CHECKOUT WORKSPACE ── */}
      <div className="mx-auto max-w-[1360px] px-4 pb-24 sm:px-6 lg:px-10">
        <Suspense fallback={<div className="surface h-[60vh] animate-pulse rounded-2xl border border-white/5" />}>
          <Checkout />
        </Suspense>
      </div>
    </div>
  );
}

async function Checkout() {
  await connection(); // per-request: the session and live settings
  const [user, settings] = await Promise.all([getSessionUser(), getSettings()]);
  const addresses: SavedAddress[] = user ? await getAddresses(user.id) : [];
  return <CheckoutForm user={user ? { name: user.name, email: user.email, phone: user.phone } : null} addresses={addresses} giftWrapPriceP={settings.giftWrapP} />;
}
