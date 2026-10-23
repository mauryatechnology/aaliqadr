"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ShoppingBag } from "lucide-react";
import { cart } from "@/lib/cart-store";
import { formatPrice, pricePerMl } from "@/lib/money";
import { isAvailable, resolveVariant, type ProductOption } from "@/lib/variants";
import { cn } from "@/lib/cn";
import { Price } from "./Price";
import { useProductState } from "./ProductState";

/**
 * Option chips (one row per axis), price, stock and Add to bag. Combinations that don't exist
 * or are switched off can't be picked; sold-out ones can be picked and say so. On phones a
 * compact bar sticks to the bottom once the main button scrolls away.
 */
export function VariantPicker({ slug, name, options }: { slug: string; name: string; options: ProductOption[] }) {
  const { variants, sku, select } = useProductState();
  const active = variants.filter((v) => v.isActive);
  const selected = active.find((v) => v.sku === sku);
  const [added, setAdded] = useState(false);
  const [showBar, setShowBar] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const el = buttonRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setShowBar(!e!.isIntersecting && e!.boundingClientRect.top < 0), { threshold: 0 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  if (!selected) return null;
  const soldOut = selected.stock <= 0;

  function add() {
    if (!selected || soldOut) return;
    cart.add({ sku: selected.sku, slug }, 1, selected.maxPerOrder);
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1800);
  }

  // Products without options but with several variants (legacy) pick by label.
  const axes: ProductOption[] = options.length ? options : active.length > 1 ? [{ name: "Size", values: active.map((v) => v.label) }] : [];
  const valuesOf = (v: (typeof active)[number]) => (options.length ? v.optionValues : [v.label]);

  const pick = (axis: number, value: string) => {
    const picked = valuesOf(selected).map((x, i) => (i === axis ? value : x));
    const next = options.length ? resolveVariant(active, picked, axis) : active.find((v) => v.label === value);
    if (next) select(next.sku);
  };

  const cta = soldOut ? "Sold out" : added ? "Added to bag" : "Add to bag";
  const ctaStyle = { background: "var(--z-primary)", color: "var(--z-on-primary)", boxShadow: "0 12px 40px -12px var(--z-glow)" };

  return (
    <div className="flex flex-col gap-6">
      {axes.map((axis, a) => (
        <fieldset key={axis.name}>
          <legend className="eyebrow mb-3">
            {axis.name}: <span className="text-fg normal-case tracking-normal">{valuesOf(selected)[a]}</span>
          </legend>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={axis.name}>
            {axis.values.map((value) => {
              const on = valuesOf(selected)[a] === value;
              const exists = options.length ? isAvailable(active, a, value, []) : true;
              const match = options.length ? resolveVariant(active, valuesOf(selected).map((x, i) => (i === a ? value : x)), a) : active.find((v) => v.label === value);
              const out = !!match && match.stock <= 0 && match.optionValues[a] === value;
              const showMl = a === 0 && match && match.volumeMl > 0 && /ml/i.test(value);
              return (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  disabled={!exists}
                  onClick={() => pick(a, value)}
                  className={cn("flex min-w-24 flex-col items-start rounded-xl border px-4 py-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-35", out && !on && "opacity-60")}
                  style={{ borderColor: on ? "var(--z-primary)" : "var(--glass-border)", background: on ? "color-mix(in oklab, var(--z-primary) 14%, transparent)" : "transparent" }}
                >
                  <span className={cn("text-sm font-medium", out && "line-through decoration-1")}>{value}</span>
                  {showMl ? <span className="text-xs text-muted">{formatPrice(pricePerMl(match.priceP, match.volumeMl))}/ml</span> : out ? <span className="text-xs text-muted">Sold out</span> : null}
                </button>
              );
            })}
          </div>
        </fieldset>
      ))}

      <div className="flex flex-col gap-1">
        <Price priceP={selected.priceP} mrpP={selected.mrpP} className="text-2xl" />
        <p className="text-xs text-muted">MRP inclusive of all taxes · {selected.label}</p>
        {soldOut ? (
          <p className="text-xs text-accent">This option is sold out. Choose another, or check back soon.</p>
        ) : selected.stock <= 5 ? (
          <p className="text-xs text-accent">Only {selected.stock} left</p>
        ) : (
          <p className="flex items-center gap-1.5 text-xs text-muted"><span className="size-1.5 rounded-full bg-emerald-400" aria-hidden /> In stock, ships in 1–2 working days</p>
        )}
      </div>

      <button
        ref={buttonRef}
        type="button"
        onClick={add}
        disabled={soldOut}
        className="group relative inline-flex h-14 items-center justify-center gap-3 overflow-hidden rounded-full px-8 font-caps text-xs uppercase tracking-[0.24em] transition-[transform,box-shadow] duration-300 ease-ember hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
        style={ctaStyle}
      >
        <span aria-hidden className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
        {added ? <Check className="size-4" /> : <ShoppingBag className="size-4" />}
        <span aria-live="polite">{cta}</span>
      </button>

      {/* Sticky bar for phones once the main button has scrolled away (sits above the bottom nav). */}
      <div
        aria-hidden={!showBar}
        className={cn(
          "surface fixed inset-x-3 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-40 flex items-center gap-3 rounded-2xl p-2 pl-4 transition-all duration-300 lg:hidden",
          showBar ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-6 opacity-0",
        )}
      >
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{name}</p>
          <p className="text-xs text-muted">{selected.label} · {formatPrice(selected.priceP)}</p>
        </div>
        <button type="button" tabIndex={showBar ? 0 : -1} onClick={add} disabled={soldOut} className="inline-flex h-11 shrink-0 items-center gap-2 rounded-full px-5 font-caps text-[11px] uppercase tracking-[0.2em] disabled:opacity-50" style={ctaStyle}>
          {added ? <Check className="size-4" /> : <ShoppingBag className="size-4" />} {soldOut ? "Sold out" : added ? "Added" : "Add"}
        </button>
      </div>
    </div>
  );
}
