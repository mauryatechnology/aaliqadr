import type { Metadata } from "next";
import { CartView } from "@/components/cart/CartView";
import { PageHero } from "@/components/layout/PageHero";

export const metadata: Metadata = {
  title: "Your Bag",
  robots: { index: false, follow: true },
};

export default function CartPage() {
  return (
    <>
      <PageHero eyebrow="Bag" title="Your bag" />
      <div className="mx-auto max-w-[1360px] px-4 pb-20 sm:px-6">
        <CartView />
      </div>
    </>
  );
}
