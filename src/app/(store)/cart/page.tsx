import type { Metadata } from "next";
import { CartView } from "@/components/cart/CartView";
import { Reveal } from "@/components/motion/Reveal";

export const metadata: Metadata = {
  title: "Your Bag | Aaliqadr",
  robots: { index: false, follow: true },
};

export default function CartPage() {
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
              <span>YOUR SELECTION · HAUTE PARFUMERIE</span>
              <span className="text-[9px]">✦</span>
            </p>
          </Reveal>

          <Reveal delay={0.08}>
            <h1 className="font-display text-4xl sm:text-6xl font-light leading-[1.05] tracking-tight max-w-4xl text-ivory">
              Shopping Bag.{" "}
              <span className="italic font-light text-[#E0C892]">
                Your fragrances.
              </span>
            </h1>
          </Reveal>
        </div>
      </section>

      {/* ── 2. CART VIEW ── */}
      <div className="mx-auto max-w-[1360px] px-4 pb-24 sm:px-6 lg:px-10">
        <CartView />
      </div>
    </div>
  );
}
