import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { Reveal } from "@/components/motion/Reveal";

/**
 * First Order Promotional Banner (White / Warm-Parchment Luxury Theme)
 * - 10% discount announcement with WELCOME10 voucher code
 * - Crisp white card with subtle champagne gold ambient illumination
 * - Cohesive with CosmicRashiStrip, ShopByElement & BrandStorySplit
 */
export function FirstOrderPromoBanner() {
  return (
    <section className="relative bg-[#FAF7F2] text-[#1A1612] py-10 sm:py-16 overflow-hidden border-t border-[#E8E2D5]">
      {/* Background Subtle Warm Gold Ambient Veil */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
      >
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[120px] w-full max-w-[900px] bg-gradient-to-r from-transparent via-[#73531F]/10 to-transparent blur-[60px]" />
      </div>

      <div className="mx-auto max-w-[1360px] px-4 sm:px-6 lg:px-10">
        <Reveal>
          <div className="relative flex flex-col md:flex-row items-center justify-between gap-6 rounded-2xl border border-[#E8E2D5] bg-white p-6 sm:p-8 md:p-10 shadow-[0_10px_30px_rgba(0,0,0,0.04)] overflow-hidden">
            {/* Soft Champagne Glow on Left Border */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_80%_at_0%_50%,rgba(201,169,110,0.08)_0%,transparent_70%)]"
            />

            {/* Left Column: Star Icon & Message */}
            <div className="relative z-10 flex items-center gap-5 sm:gap-6 text-center md:text-left">
              <div className="hidden sm:grid size-12 place-items-center rounded-full bg-[#73531F]/10 border border-[#73531F]/30 text-[#73531F] shrink-0 shadow-[0_0_16px_rgba(115,83,31,0.15)]">
                <Sparkles className="size-6 text-[#73531F]" />
              </div>

              <div>
                <p className="font-caps text-xs tracking-[0.24em] text-[#73531F] font-semibold uppercase mb-1">
                  THE STARS HAVE A GIFT FOR YOU
                </p>
                <h3 className="font-display text-2xl sm:text-3xl lg:text-4xl font-normal text-[#1A1612] tracking-tight">
                  Get 10% Off on Your First Order
                </h3>
                <p className="mt-2 text-sm sm:text-base text-[#3E3830] font-normal leading-relaxed flex flex-wrap items-center justify-center md:justify-start gap-2">
                  <span>Use invitation code</span>
                  <span className="font-mono font-bold text-[#73531F] bg-[#FAF7F2] px-3.5 py-1.5 rounded-md border border-[#73531F]/35 tracking-widest text-sm shadow-xs select-all">
                    WELCOME10
                  </span>
                  <span>at checkout</span>
                </p>
              </div>
            </div>

            {/* Right Column: CTA Button */}
            <div className="relative z-10 shrink-0">
              <Link
                href="/shop"
                className="group inline-flex min-h-[48px] items-center gap-2.5 rounded-full bg-[#1A1612] text-[#FAF7F2] border border-[#1A1612] px-8 py-3.5 font-caps text-xs sm:text-[13px] uppercase tracking-[0.2em] font-semibold transition-all duration-200 hover:bg-[#73531F] hover:border-[#73531F] hover:shadow-[0_6px_20px_rgba(115,83,31,0.25)] hover:-translate-y-0.5 active:translate-y-0 active:scale-98 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#73531F] focus-visible:ring-offset-2"
              >
                <span>Shop Creations</span>
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
