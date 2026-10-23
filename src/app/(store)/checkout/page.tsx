import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { getSessionUser } from "@/server/auth";
import { getAddresses } from "@/server/queries/account";
import { getSettings } from "@/server/services/settings";
import { PageHero } from "@/components/layout/PageHero";
import { CheckoutForm, type SavedAddress } from "@/components/checkout/CheckoutForm";

export const metadata: Metadata = {
  title: "Checkout",
  robots: { index: false, follow: false },
};

export default function CheckoutPage() {
  return (
    <>
      <PageHero eyebrow="Secure checkout" title="Checkout" />
      <div className="mx-auto max-w-[1360px] px-4 pb-24 sm:px-6">
        <Suspense fallback={<div className="surface h-[60vh] animate-pulse" />}>
          <Checkout />
        </Suspense>
      </div>
    </>
  );
}

async function Checkout() {
  await connection(); // per-request: the session and live settings
  const [user, settings] = await Promise.all([getSessionUser(), getSettings()]);
  const addresses: SavedAddress[] = user ? await getAddresses(user.id) : [];
  return <CheckoutForm user={user ? { name: user.name, email: user.email, phone: user.phone } : null} addresses={addresses} giftWrapPriceP={settings.giftWrapP} />;
}
