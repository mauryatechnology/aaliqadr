"use client";

import Image from "next/image";
import { useState } from "react";
import { discountPercent, formatPrice } from "@/lib/money";
import { cx } from "@/lib/cx";
import type { ProductCardDTO } from "@/server/catalog/types";

/**
 * Size / edition chips on a card (plan.md §10.1). Hover, focus or tap one and the card shows
 * that variant's photo and price; the card link still opens the product.
 */
export function CardSwatches({ product }: { product: Pick<ProductCardDTO, "slug" | "name" | "quickVariants"> }) {
  const [active, setActive] = useState<string | null>(null);
  const variants = product.quickVariants;
  if (variants.length < 2) return null;
  const v = variants.find((x) => x.sku === active);
  const shown = variants.slice(0, 4);
  const off = v ? discountPercent(v.mrpP, v.priceP) : 0;
  return (
    <>
      {/* Overlays the card's photo and price while a chip is active. */}
      {v?.image && (
        <span className="pointer-events-none absolute inset-x-0 top-0 z-[5] aspect-[4/5] overflow-hidden">
          <Image src={v.image.url} alt={v.image.alt} fill sizes="(min-width: 1024px) 25vw, 50vw" className="object-cover" placeholder={v.image.blurDataURL ? "blur" : "empty"} blurDataURL={v.image.blurDataURL} />
        </span>
      )}
      {v && (
        <span aria-live="polite" className="pointer-events-none absolute inset-x-3 bottom-11 z-[5] rounded-md bg-[var(--z-bg)]/90 px-2 py-1 text-xs backdrop-blur sm:inset-x-5">
          <span className="font-medium">{v.label}: {formatPrice(v.priceP)}</span>
          {off > 0 && <span className="ml-2 text-muted line-through">{formatPrice(v.mrpP)}</span>}
          {!v.inStock && <span className="ml-2 text-red-300">Sold out</span>}
        </span>
      )}
      <div className="relative z-10 flex flex-wrap gap-1 px-3 pb-3 sm:px-5 sm:pb-4" onMouseLeave={() => setActive(null)}>
        {shown.map((x) => (
          <button
            key={x.sku}
            type="button"
            onMouseEnter={() => setActive(x.sku)}
            onFocus={() => setActive(x.sku)}
            onClick={() => setActive(active === x.sku ? null : x.sku)}
            aria-pressed={active === x.sku}
            aria-label={`${product.name}, ${x.label}: ${formatPrice(x.priceP)}${x.inStock ? "" : ", sold out"}`}
            className={cx("rounded-full border px-2 py-0.5 text-[10px] transition-colors sm:text-[11px]", active === x.sku ? "border-gold text-gold" : "border-white/15 text-fg/75 hover:border-gold/60", !x.inStock && "line-through opacity-50")}
          >
            {x.label}
          </button>
        ))}
        {variants.length > shown.length && <span className="px-1 text-[10px] text-muted">+{variants.length - shown.length}</span>}
      </div>
    </>
  );
}
