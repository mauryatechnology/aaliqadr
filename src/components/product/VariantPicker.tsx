"use client";

import { useState } from "react";
import { Check, ShoppingBag } from "lucide-react";
import { cart } from "@/lib/cart-store";
import { formatPrice, pricePerMl } from "@/lib/money";
import type { Variant } from "@/server/catalog/types";
import { Price } from "./Price";

export function VariantPicker({ slug, variants }: { slug: string; variants: Variant[] }) {
  const active = variants.filter((v) => v.isActive);
  const [sku, setSku] = useState(() => (active.find((v) => v.stock > 0) ?? active[0])?.sku);
  const [added, setAdded] = useState(false);
  const selected = active.find((v) => v.sku === sku);
  if (!selected) return null;
  const soldOut = selected.stock <= 0;

  function add() {
    if (!selected || soldOut) return;
    cart.add({ sku: selected.sku, slug }, 1, selected.maxPerOrder);
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1800);
  }

  return (
    <div className="flex flex-col gap-6">
      {active.length > 1 && (
        <fieldset>
          <legend className="eyebrow mb-3">Size</legend>
          <div className="flex flex-wrap gap-2" role="radiogroup">
            {active.map((v) => {
              const on = v.sku === sku;
              return (
                <button
                  key={v.sku}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => setSku(v.sku)}
                  className="flex min-w-24 flex-col items-start rounded-xl border px-4 py-3 text-left transition-colors"
                  style={{
                    borderColor: on ? "var(--z-primary)" : "var(--glass-border)",
                    background: on ? "color-mix(in oklab, var(--z-primary) 14%, transparent)" : "transparent",
                  }}
                >
                  <span className="text-sm font-medium">{v.label}</span>
                  <span className="text-xs text-muted">{formatPrice(pricePerMl(v.priceP, v.volumeMl))}/ml</span>
                </button>
              );
            })}
          </div>
        </fieldset>
      )}

      <div className="flex flex-col gap-1">
        <Price priceP={selected.priceP} mrpP={selected.mrpP} className="text-2xl" />
        <p className="text-xs text-muted">MRP inclusive of all taxes · {selected.label}</p>
        {!soldOut && selected.stock <= 5 && <p className="text-xs text-accent">Only {selected.stock} left</p>}
      </div>

      <button
        type="button"
        onClick={add}
        disabled={soldOut}
        className="group relative inline-flex h-14 items-center justify-center gap-3 overflow-hidden rounded-full px-8 font-caps text-xs uppercase tracking-[0.24em] transition-[transform,box-shadow] duration-300 ease-ember hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
        style={{ background: "var(--z-primary)", color: "var(--z-on-primary)", boxShadow: "0 12px 40px -12px var(--z-glow)" }}
      >
        <span aria-hidden className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
        {added ? <Check className="size-4" /> : <ShoppingBag className="size-4" />}
        <span aria-live="polite">{soldOut ? "Sold out" : added ? "Added to bag" : "Add to bag"}</span>
      </button>
    </div>
  );
}
