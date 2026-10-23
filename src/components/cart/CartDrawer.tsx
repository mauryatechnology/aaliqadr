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
import { cn } from "@/lib/cn";

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
  const remainingP = view?.freeShippingRemainingP ?? (subtotalP > 0 ? Math.max(0, thresholdP - subtotalP) : thresholdP);
  const freeShippingUnlocked = subtotalP > 0 && remainingP <= 0;
  const progressPercent = Math.min(100, Math.round((subtotalP / thresholdP) * 100));

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-label="Shopping bag">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/75 backdrop-blur-sm transition-opacity duration-300 animate-in fade-in"
        onClick={() => setDrawerOpen(false)}
        aria-hidden="true"
      />

      {/* Slide-over Drawer Panel */}
      <div
        ref={drawerRef}
        className="relative z-10 flex h-full w-full max-w-md flex-col border-l border-white/10 bg-[#0c0a10] text-fg shadow-2xl transition-transform duration-300 ease-lux sm:max-w-lg animate-in slide-in-from-right"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <ShoppingBag className="size-5 text-gold" strokeWidth={1.7} />
            <h2 className="font-display text-xl font-medium tracking-wide sm:text-2xl">Your Bag</h2>
            {view && view.itemCount > 0 && (
              <span className="rounded-full bg-gold/20 px-2 py-0.5 text-xs font-semibold text-gold-light">
                {view.itemCount}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={() => setDrawerOpen(false)}
            className="rounded-full p-2 text-ivory/70 transition-colors hover:bg-white/10 hover:text-white"
            aria-label="Close bag"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Free Shipping Progress Meter */}
        <div className="border-b border-white/10 bg-white/[0.02] px-5 py-3.5 sm:px-6">
          <div className="flex items-center justify-between gap-2 text-xs">
            {freeShippingUnlocked ? (
              <span className="flex items-center gap-1.5 font-medium text-gold-light">
                <Truck className="size-4 text-gold" />
                <span>🎉 <strong>Free Express Shipping</strong> Unlocked!</span>
              </span>
            ) : (
              <span className="text-ivory/80">
                Add <strong>{formatPrice(remainingP)}</strong> more for <strong>Free Express Shipping</strong>
              </span>
            )}
            <span className="text-[11px] font-semibold text-gold/90">{progressPercent}%</span>
          </div>
          {/* Progress track */}
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-500 ease-lux",
                freeShippingUnlocked
                  ? "bg-gradient-to-r from-gold via-gold-light to-gold shadow-[0_0_12px_rgba(196,160,68,0.7)]"
                  : "bg-gradient-to-r from-gold/60 to-gold"
              )}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Body / Items List */}
        <div
          aria-busy={pending}
          className={cn("flex-1 overflow-y-auto px-5 py-4 [scrollbar-width:thin] sm:px-6 transition-opacity duration-200", pending && "opacity-70")}
        >
          {lines.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-4 py-12 text-center">
              <div className="grid size-16 place-items-center rounded-full bg-white/[0.04] text-gold/70">
                <ShoppingBag className="size-8" strokeWidth={1.3} />
              </div>
              <h3 className="font-display text-2xl font-light text-ivory">Your bag is empty</h3>
              <p className="max-w-xs text-xs text-ivory/60">
                Twelve luxury Extraits composed for each rashi. Begin by finding the fragrance written in your stars.
              </p>
              <div className="mt-3 flex flex-col gap-2.5 w-full max-w-xs">
                <Link
                  href="/find-my-sign"
                  onClick={() => setDrawerOpen(false)}
                  className="rounded-full bg-gold py-2.5 text-center font-caps text-[0.68rem] uppercase tracking-[0.2em] text-obsidian font-semibold transition hover:bg-gold-light"
                >
                  Find My Sign
                </Link>
                <Link
                  href="/shop"
                  onClick={() => setDrawerOpen(false)}
                  className="rounded-full border border-white/20 py-2.5 text-center font-caps text-[0.68rem] uppercase tracking-[0.2em] text-ivory transition hover:border-gold hover:text-gold"
                >
                  Explore The Collection
                </Link>
              </div>
            </div>
          ) : (
            <ul className="divide-y divide-white/10">
              {(view?.lines ?? []).map((l) => {
                const imgUrl = l.image || (l.zodiacSign ? `/bottles/${l.zodiacSign}.svg` : "/bottles/brand.svg");
                return (
                  <li key={l.sku} data-zodiac={l.zodiacSign} className="flex gap-4 py-4">
                    {/* Item Image */}
                    <Link
                      href={routes.product(l.slug)}
                      onClick={() => setDrawerOpen(false)}
                      className="relative grid size-20 shrink-0 place-items-center overflow-hidden rounded-xl border border-white/10 p-1.5 transition-transform hover:scale-105"
                      style={{ background: "radial-gradient(circle at 50% 35%, var(--z-g2, #2a2318), var(--z-bg, #0b0a0f) 85%)" }}
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
                    <div className="flex flex-1 flex-col justify-between">
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <Link
                            href={routes.product(l.slug)}
                            onClick={() => setDrawerOpen(false)}
                            className="font-display text-base font-medium text-ivory hover:text-gold line-clamp-1"
                          >
                            {l.name}
                          </Link>
                          <button
                            type="button"
                            onClick={() => cart.setQty(l.sku, 0)}
                            className="text-ivory/40 hover:text-red-400 transition-colors p-0.5"
                            aria-label={`Remove ${l.name}`}
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </div>
                        <p className="text-xs text-ivory/60 mt-0.5">{l.variantLabel}</p>
                      </div>

                      {/* Quantity Stepper and Price */}
                      <div className="mt-3 flex items-center justify-between">
                        <div className="flex items-center rounded-full border border-white/20 bg-white/[0.03]">
                          <button
                            type="button"
                            className="grid size-7 place-items-center text-ivory/70 hover:text-white"
                            aria-label="Decrease quantity"
                            onClick={() => cart.setQty(l.sku, l.qty - 1)}
                          >
                            <Minus className="size-3" />
                          </button>
                          <span className="w-6 text-center text-xs font-semibold text-ivory">
                            {l.qty}
                          </span>
                          <button
                            type="button"
                            className="grid size-7 place-items-center text-ivory/70 hover:text-white disabled:opacity-30"
                            aria-label="Increase quantity"
                            disabled={l.qty >= l.maxQty}
                            onClick={() => cart.setQty(l.sku, l.qty + 1)}
                          >
                            <Plus className="size-3" />
                          </button>
                        </div>

                        <span className="font-sans text-sm font-semibold text-ivory">
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

        {/* Footer / Checkout */}
        {lines.length > 0 && (
          <div className="border-t border-white/10 bg-[#0c0a10]/95 px-5 py-4 sm:px-6">
            <div className="flex flex-col gap-1.5 pb-3">
              <div className="flex items-center justify-between text-xs text-ivory/70">
                <span>Subtotal</span>
                <span className="font-medium text-ivory">{view ? formatPrice(view.subtotalP) : "…"}</span>
              </div>
              <div className="flex items-center justify-between text-xs text-ivory/70">
                <span>Shipping</span>
                <span>
                  {freeShippingUnlocked ? (
                    <strong className="text-gold-light">FREE</strong>
                  ) : (
                    "Calculated at checkout"
                  )}
                </span>
              </div>
              {view && view.savingsP > 0 && (
                <div className="flex items-center justify-between text-xs text-gold-light">
                  <span>Special Savings</span>
                  <span>−{formatPrice(view.savingsP)}</span>
                </div>
              )}
            </div>

            <Link
              href="/checkout"
              onClick={() => setDrawerOpen(false)}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-gold py-3.5 font-caps text-xs uppercase tracking-[0.2em] font-semibold text-obsidian shadow-[0_4px_24px_rgba(196,160,68,0.35)] transition hover:bg-gold-light"
            >
              <span>Proceed to Checkout</span>
              <ArrowRight className="size-4" />
            </Link>

            <div className="mt-2.5 flex items-center justify-between text-[11px] text-ivory/50">
              <Link
                href="/cart"
                onClick={() => setDrawerOpen(false)}
                className="underline decoration-ivory/30 underline-offset-4 hover:text-gold"
              >
                View full bag details
              </Link>
              <span className="flex items-center gap-1">
                <Sparkles className="size-3 text-gold/70" /> Authentic Extrait de Parfum
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
