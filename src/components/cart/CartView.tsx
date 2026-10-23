"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { Minus, Plus, Trash2 } from "lucide-react";
import { priceCartAction } from "@/actions/cart";
import { cart, useCart } from "@/lib/cart-store";
import { formatPrice } from "@/lib/money";
import type { CartView as View } from "@/server/services/pricing";
import { BottleArt } from "@/components/zodiac/BottleArt";
import { routes } from "@/lib/routes";

export function CartView() {
  const lines = useCart();
  const [view, setView] = useState<View | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const key = lines.map((l) => `${l.sku}:${l.qty}`).join(",");

  useEffect(() => {
    startTransition(async () => {
      const res = await priceCartAction(lines.map(({ sku, qty }) => ({ sku, qty })));
      if (res.ok) {
        setView(res.data);
        setError(null);
        // Server is the source of truth: drop lines it removed, clamp quantities it capped.
        for (const l of lines) {
          const priced = res.data.lines.find((p) => p.sku === l.sku);
          if (!priced) cart.setQty(l.sku, 0);
          else if (priced.qty !== l.qty) cart.setQty(l.sku, priced.qty);
        }
      } else setError(res.error);
    });
    // `key` captures the line contents; `lines` identity changes on every store write.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  if (lines.length === 0 && !pending) {
    return (
      <div className="surface flex flex-col items-center gap-5 p-12 text-center">
        <h2 className="font-display text-3xl">Your bag is empty</h2>
        <p className="text-muted">Begin with your sign, or let the Discovery Coffret decide.</p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link href="/find-my-sign" className="rounded-full bg-gold px-6 py-3 font-caps text-[0.7rem] uppercase tracking-[0.22em] text-obsidian">
            Find my sign
          </Link>
          <Link href="/shop" className="rounded-full border border-gold/40 px-6 py-3 font-caps text-[0.7rem] uppercase tracking-[0.22em]">
            Shop all
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1.6fr_1fr]" aria-busy={pending}>
      <section aria-label="Items">
        {error && <p className="mb-4 rounded-xl border border-red-400/40 p-4 text-sm text-red-200">{error}</p>}
        {view?.warnings.map((w) => (
          <p key={w} className="mb-3 rounded-xl border border-gold/30 p-3 text-sm text-gold-light">
            {w}
          </p>
        ))}
        <ul className="flex flex-col divide-y divide-white/10">
          {(view?.lines ?? []).map((l) => (
            <li key={l.sku} data-zodiac={l.zodiacSign} className="flex gap-4 py-5">
              <Link href={routes.product(l.slug)} className="grid h-28 w-22 shrink-0 place-items-center rounded-xl p-2" style={{ background: "radial-gradient(circle at 50% 35%, var(--z-g2), var(--z-bg) 85%)" }}>
                <BottleArt sign={l.zodiacSign} className="h-full w-auto" />
              </Link>
              <div className="flex flex-1 flex-col gap-1">
                <Link href={routes.product(l.slug)} className="font-display text-xl hover:text-gold">
                  {l.name}
                </Link>
                <p className="text-sm text-muted">{l.variantLabel}</p>
                <div className="mt-auto flex items-center justify-between gap-3">
                  <div className="flex items-center rounded-full border border-white/15">
                    <button type="button" className="grid size-9 place-items-center" aria-label={`Decrease ${l.name}`} onClick={() => cart.setQty(l.sku, l.qty - 1)}>
                      <Minus className="size-3.5" />
                    </button>
                    <span className="w-6 text-center text-sm" aria-label="Quantity">
                      {l.qty}
                    </span>
                    <button
                      type="button"
                      className="grid size-9 place-items-center disabled:opacity-30"
                      aria-label={`Increase ${l.name}`}
                      disabled={l.qty >= l.maxQty}
                      onClick={() => cart.setQty(l.sku, l.qty + 1)}
                    >
                      <Plus className="size-3.5" />
                    </button>
                  </div>
                  <span className="font-medium">{formatPrice(l.lineTotalP)}</span>
                  <button type="button" className="grid size-9 place-items-center text-muted hover:text-fg" aria-label={`Remove ${l.name}`} onClick={() => cart.setQty(l.sku, 0)}>
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <aside className="surface flex h-fit flex-col gap-4 p-6 lg:sticky lg:top-24">
        <h2 className="eyebrow">Summary</h2>
        {view && view.freeShippingRemainingP > 0 && (
          <div className="flex flex-col gap-2">
            <p className="text-sm text-muted">Add {formatPrice(view.freeShippingRemainingP)} more for free shipping</p>
            <div className="h-1 overflow-hidden rounded-full bg-white/10">
              <div className="h-full bg-gold transition-[width] duration-700" style={{ width: `${Math.min(100, (view.subtotalP / (view.subtotalP + view.freeShippingRemainingP)) * 100)}%` }} />
            </div>
          </div>
        )}
        <dl className="flex flex-col gap-2 text-sm">
          <Row label="Subtotal" value={view ? formatPrice(view.subtotalP) : "…"} />
          {view && view.savingsP > 0 && <Row label="You save" value={`− ${formatPrice(view.savingsP)}`} accent />}
          <Row label="Shipping" value={view ? (view.shippingP === 0 ? "Free" : formatPrice(view.shippingP)) : "…"} />
        </dl>
        <div className="hairline" />
        <Row label="Total" value={view ? formatPrice(view.totalP) : "…"} big />
        <p className="text-xs text-muted">Inclusive of all taxes. Coupons and gift options are added at checkout.</p>
        <Link
          href="/checkout"
          aria-disabled={!view || view.lines.length === 0}
          className="flex h-12 items-center justify-center rounded-full bg-gold font-caps text-[0.7rem] uppercase tracking-[0.22em] text-obsidian aria-disabled:pointer-events-none aria-disabled:opacity-60"
        >
          Checkout securely
        </Link>
      </aside>
    </div>
  );
}

function Row({ label, value, accent, big }: { label: string; value: string; accent?: boolean; big?: boolean }) {
  return (
    <div className={`flex items-baseline justify-between ${big ? "text-lg" : ""}`}>
      <dt className={big ? "font-medium" : "text-muted"}>{label}</dt>
      <dd className={accent ? "text-gold" : big ? "font-display text-2xl" : ""}>{value}</dd>
    </div>
  );
}
