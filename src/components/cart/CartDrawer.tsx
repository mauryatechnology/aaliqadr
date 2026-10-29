"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { ArrowRight, Minus, Plus, ShoppingBag, Sparkles, Trash2, Truck, X } from "lucide-react";
import { cart, useCart, useCartDrawer } from "@/lib/cart-store";
import { priceCartAction } from "@/actions/cart";
import { formatPrice } from "@/lib/money";
import type { CartView as View } from "@/server/services/pricing";
import { routes } from "@/lib/routes";
import { site } from "@/config/site";
import { cx as cn } from "@/lib/cx";

export function CartDrawer() {
  const [isOpen, setDrawerOpen] = useCartDrawer();
  const lines = useCart();
  const [view, setView] = useState<View | null>(null);
  const [pending, startTransition] = useTransition();
  const drawerRef = useRef<HTMLDivElement>(null);
  const key = lines.map((l) => `${l.sku}:${l.qty}`).join(",");

  // Fetch real server pricing whenever items change
  useEffect(() => {
    let active = true;
    startTransition(async () => {
      if (lines.length === 0) {
        if (active) setView(null);
        return;
      }
      const res = await priceCartAction(lines.map(({ sku, qty }) => ({ sku, qty })));
      if (active && res.ok) {
        setView(res.data);
      }
    });
    return () => {
      active = false;
    };
  }, [key, lines]);

  // Handle ESC key to close drawer
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDrawerOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    // Lock body scroll when drawer is open
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen, setDrawerOpen]);

  if (!isOpen) return null;

  const thresholdP = site.freeShippingAboveP; // 149900 paise (₹1,499)
  const subtotalP = view?.subtotalP ?? 0;
  const remainingP =
    subtotalP > 0
      ? view?.freeShippingRemainingP !== undefined && view.freeShippingRemainingP > 0
        ? view.freeShippingRemainingP
        : Math.max(0, thresholdP - subtotalP)
      : thresholdP;
  const freeShippingUnlocked = subtotalP > 0 && remainingP <= 0;
  const progressPercent = subtotalP > 0 ? Math.min(100, Math.round((subtotalP / thresholdP) * 100)) : 0;
  const hasRealItems = (view?.lines?.length ?? 0) > 0 || (lines.length > 0 && pending);

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end"
      role="dialog"
      aria-modal="true"
      aria-label="Your Fragrance Bag"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-obsidian/85 backdrop-blur-md transition-opacity duration-500 animate-in fade-in"
        onClick={() => setDrawerOpen(false)}
        aria-hidden="true"
      />

      {/* Slide-over Drawer Panel */}
      <div
        ref={drawerRef}
        className="relative z-10 flex h-full w-full max-w-md flex-col border-l border-gold/25 bg-[#0E0C14]/98 text-ivory backdrop-blur-xl shadow-[0_0_80px_rgba(0,0,0,0.95)] transition-transform duration-500 ease-lux sm:max-w-md animate-in slide-in-from-right"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gold/20 bg-bg/95 px-5 py-4.5 sm:px-6 shadow-xs">
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-full border border-gold/35 bg-gold/10 text-gold shadow-xs">
              <ShoppingBag className="size-4.5" strokeWidth={1.75} />
            </div>
            <h2 className="font-display text-xl sm:text-2xl font-light text-ivory tracking-wide">
              Your Bag
            </h2>
            {view && view.itemCount > 0 && (
              <span className="rounded-full border border-gold/40 bg-gold/15 px-2.5 py-0.5 font-caps text-[11px] text-gold font-semibold uppercase tracking-[0.16em]">
                {view.itemCount} {view.itemCount === 1 ? "Item" : "Items"}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={() => setDrawerOpen(false)}
            className="flex size-8.5 items-center justify-center rounded-full border border-gold/30 bg-surface/60 text-ivory/80 hover:border-gold hover:bg-gold/15 hover:text-gold transition-all cursor-pointer active:scale-95"
            aria-label="Close bag"
          >
            <X className="size-4" strokeWidth={1.75} />
          </button>
        </div>

        {/* Free Shipping Progress Meter */}
        <div className="border-b border-gold/15 bg-surface/60 px-5 py-3.5 sm:px-6 backdrop-blur-md">
          <div className="flex items-center justify-between gap-2 text-xs sm:text-[13px]">
            {freeShippingUnlocked ? (
              <span className="flex items-center gap-2 font-semibold text-gold font-caps text-xs uppercase tracking-[0.18em]">
                <Truck className="size-4 text-gold shrink-0" strokeWidth={1.75} />
                <span>✦ Complimentary Express Shipping Unlocked!</span>
              </span>
            ) : subtotalP === 0 ? (
              <span className="text-ivory/90 text-xs sm:text-[13px] font-normal">
                Complimentary Express Shipping on orders above <strong className="text-gold font-semibold">₹1,499</strong>
              </span>
            ) : (
              <span className="text-ivory/90 text-xs sm:text-[13px] font-normal">
                Add <strong className="text-gold font-semibold">{formatPrice(remainingP)}</strong> more for{" "}
                <strong className="text-gold-soft font-semibold">Free Express Shipping</strong>
              </span>
            )}
            <span className="font-caps text-xs font-semibold text-gold">{progressPercent}%</span>
          </div>

          {/* Progress track */}
          <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-surface/90 border border-gold/25">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-500 ease-lux",
                freeShippingUnlocked
                  ? "bg-gradient-to-r from-gold via-[#E8CF8A] to-gold shadow-[0_0_12px_rgba(201,169,110,0.85)]"
                  : "bg-gradient-to-r from-[#B38738] to-[#E2C37E]"
              )}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Body / Items List */}
        <div
          aria-busy={pending}
          className={cn(
            "flex-1 overflow-y-auto px-5 py-6 [scrollbar-width:thin] sm:px-6 transition-opacity duration-200",
            pending && "opacity-70"
          )}
        >
          {!hasRealItems ? (
            /* Luxury Empty State */
            <div className="flex h-full flex-col items-center justify-center py-6 px-4 text-center">
              {/* Luminous Gold Halo Medallion */}
              <div className="relative mb-6 flex size-24 items-center justify-center rounded-2xl border border-gold/40 bg-gradient-to-b from-[#251D14] via-[#1A140E] to-[#100D09] shadow-[inset_0_1px_2px_rgba(255,230,160,0.3),0_8px_32px_rgba(0,0,0,0.7)]">
                <ShoppingBag className="size-10 text-gold drop-shadow-[0_2px_8px_rgba(201,169,110,0.5)]" strokeWidth={1.5} />
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-0 -z-10 rounded-2xl bg-gold/20 blur-xl"
                />
              </div>

              <p className="eyebrow flex items-center justify-center gap-1.5 text-gold font-semibold tracking-[0.28em] text-xs uppercase mb-2">
                <span className="text-[9px]">✦</span>
                <span>MAISON BAG EMPTY</span>
                <span className="text-[9px]">✦</span>
              </p>
              <h3 className="font-display text-2xl sm:text-3xl font-light text-ivory mb-2.5">
                Your bag awaits its signature
              </h3>
              <p className="max-w-xs text-sm text-ivory/85 font-normal leading-relaxed mb-7">
                Twelve bespoke Extrait de Parfum creations, hand-poured with 28% noble oil concentration. Discover the fragrance written in your stars.
              </p>

              <div className="flex flex-col gap-3 w-full max-w-xs">
                <Link
                  href="/find-my-sign"
                  onClick={() => setDrawerOpen(false)}
                  className="rounded-xl bg-gradient-to-r from-[#D4AF37] via-[#F3E5AB] to-[#C9A96E] py-3.5 px-5 text-center font-caps text-xs sm:text-[12.5px] uppercase tracking-[0.2em] text-[#0B0A0F] font-bold shadow-[0_4px_20px_rgba(201,169,110,0.35)] hover:shadow-[0_6px_28px_rgba(201,169,110,0.5)] hover:scale-[1.02] active:scale-98 transition-all"
                >
                  ✦ Find My Astrological Sign
                </Link>
                <Link
                  href="/shop"
                  onClick={() => setDrawerOpen(false)}
                  className="rounded-xl border border-gold/45 bg-surface/90 py-3.5 px-5 text-center font-caps text-xs sm:text-[12.5px] uppercase tracking-[0.2em] text-ivory font-semibold hover:border-gold hover:bg-gold/15 hover:text-gold active:scale-98 transition-all shadow-xs"
                >
                  Explore All Fragrances
                </Link>
                <Link
                  href="/perfume/zodiac-discovery-coffret"
                  onClick={() => setDrawerOpen(false)}
                  className="rounded-xl border border-gold/30 bg-gold/[0.08] py-3 px-5 text-center font-caps text-[11px] uppercase tracking-[0.18em] text-gold font-semibold hover:border-gold hover:bg-gold/20 hover:text-ivory active:scale-98 transition-all"
                >
                  Sample Discovery Coffret (12 x 2ml)
                </Link>
              </div>
            </div>
          ) : (
            /* Itemized Cart List */
            <ul className="divide-y divide-gold/10">
              {(view?.lines ?? []).map((l) => {
                const imgUrl = l.image || (l.zodiacSign ? `/bottles/${l.zodiacSign}.svg` : "/bottles/brand.svg");
                return (
                  <li key={l.sku} data-zodiac={l.zodiacSign} className="flex gap-4 py-4.5 rounded-xl border border-gold/15 bg-surface/40 p-3.5 mb-3 backdrop-blur-sm">
                    {/* Item Image */}
                    <Link
                      href={routes.product(l.slug)}
                      onClick={() => setDrawerOpen(false)}
                      className="relative grid size-20 shrink-0 place-items-center overflow-hidden rounded-lg border border-gold/30 bg-surface/90 p-2 shadow-xs transition-transform hover:scale-105"
                    >
                      <Image
                        src={imgUrl}
                        alt={l.name}
                        fill
                        sizes="80px"
                        unoptimized={imgUrl.endsWith(".svg")}
                        className={imgUrl.endsWith(".svg") ? "object-contain p-1" : "object-cover"}
                      />
                    </Link>

                    {/* Details */}
                    <div className="flex flex-1 flex-col justify-between min-w-0">
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <Link
                            href={routes.product(l.slug)}
                            onClick={() => setDrawerOpen(false)}
                            className="font-display text-base font-medium text-ivory hover:text-gold line-clamp-1 transition-colors"
                          >
                            {l.name}
                          </Link>
                          <button
                            type="button"
                            onClick={() => cart.setQty(l.sku, 0)}
                            className="text-ivory/60 hover:text-red-400 transition-colors p-1.5 rounded-sm hover:bg-white/5 active:scale-95 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-red-400"
                            aria-label={`Remove ${l.name}`}
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </div>
                        <p className="font-caps text-[11px] uppercase tracking-[0.16em] text-gold-soft font-medium mt-0.5">
                          {l.variantLabel}
                        </p>
                      </div>

                      {/* Quantity Stepper and Price */}
                      <div className="mt-3 flex items-center justify-between">
                        <div className="flex items-center border border-gold/40 bg-surface/90 rounded-md shadow-xs">
                          <button
                            type="button"
                            className="grid size-8.5 min-h-[34px] min-w-[34px] place-items-center text-ivory/80 hover:text-gold hover:bg-white/5 active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gold"
                            aria-label="Decrease quantity"
                            onClick={() => cart.setQty(l.sku, l.qty - 1)}
                          >
                            <Minus className="size-3.5" />
                          </button>
                          <span className="w-7 text-center text-xs font-semibold text-ivory select-none">
                            {l.qty}
                          </span>
                          <button
                            type="button"
                            className="grid size-8.5 min-h-[34px] min-w-[34px] place-items-center text-ivory/80 hover:text-gold hover:bg-white/5 active:scale-95 disabled:opacity-30 transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gold"
                            aria-label="Increase quantity"
                            disabled={l.qty >= l.maxQty}
                            onClick={() => cart.setQty(l.sku, l.qty + 1)}
                          >
                            <Plus className="size-3.5" />
                          </button>
                        </div>

                        <span className="font-display text-base font-normal text-gold">
                          {formatPrice(l.lineTotalP)}
                        </span>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Footer / Checkout (Visible when items exist) */}
        {hasRealItems && (
          <div className="border-t border-gold/20 bg-bg/95 px-5 py-5 sm:px-6 backdrop-blur-md shadow-lg">
            <div className="flex flex-col gap-2 pb-3.5">
              <div className="flex items-center justify-between text-xs sm:text-[13px] text-ivory/90">
                <span className="font-caps uppercase tracking-[0.18em] text-ivory/80 font-medium">Subtotal</span>
                <span className="font-display text-base font-normal text-ivory">
                  {view ? formatPrice(view.subtotalP) : "…"}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs sm:text-[13px] text-ivory/90">
                <span className="font-caps uppercase tracking-[0.18em] text-ivory/80 font-medium">Express Shipping</span>
                <span>
                  {freeShippingUnlocked ? (
                    <strong className="font-caps text-xs uppercase tracking-[0.18em] text-gold font-semibold">
                      Complimentary
                    </strong>
                  ) : (
                    <span className="text-ivory/70 text-xs">Calculated at checkout</span>
                  )}
                </span>
              </div>
              {view && view.savingsP > 0 && (
                <div className="flex items-center justify-between text-xs text-gold">
                  <span className="font-caps uppercase tracking-[0.18em] font-medium">Special Savings</span>
                  <span className="font-display text-sm font-semibold">−{formatPrice(view.savingsP)}</span>
                </div>
              )}
            </div>

            <Link
              href="/checkout"
              onClick={() => setDrawerOpen(false)}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#D4AF37] via-[#F3E5AB] to-[#C9A96E] py-4 font-caps text-xs sm:text-[13px] uppercase tracking-[0.22em] font-bold text-[#0B0A0F] shadow-[0_4px_24px_rgba(201,169,110,0.35)] hover:shadow-[0_6px_30px_rgba(201,169,110,0.5)] hover:scale-[1.01] active:scale-98 transition-all"
            >
              <span>Proceed to Checkout</span>
              <ArrowRight className="size-4" />
            </Link>

            <div className="mt-3 flex items-center justify-between text-[11px] text-ivory/60">
              <Link
                href="/cart"
                onClick={() => setDrawerOpen(false)}
                className="underline decoration-ivory/30 underline-offset-4 hover:text-gold transition-colors font-caps text-[10px] uppercase tracking-[0.16em]"
              >
                View Full Bag Details
              </Link>
              <span className="flex items-center gap-1 font-caps text-[10px] uppercase tracking-[0.16em] text-gold/80">
                <Sparkles className="size-3 text-gold" /> 28% Pure Extrait
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
