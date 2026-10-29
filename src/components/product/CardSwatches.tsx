"use client";

import Image from "next/image";
import { useState } from "react";
import { formatPrice } from "@/lib/money";
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
  return (
    <>
      {/* Overlays the card's photo and price while a chip is active. */}
      {v?.image && (
        <span className="pointer-events-none absolute inset-x-0 top-0 z-[5] aspect-[4/5] overflow-hidden">
          <Image src={v.image.url} alt={v.image.alt} fill sizes="(min-width: 1024px) 25vw, 50vw" className="object-cover" placeholder={v.image.blurDataURL ? "blur" : "empty"} blurDataURL={v.image.blurDataURL} />
        </span>
      )}
      {v && (
        <span aria-live="polite" className="pointer-events-none absolute inset-x-3 bottom-11 z-[5] rounded-none border border-line bg-surface/95 px-2.5 py-1 text-xs backdrop-blur-md sm:inset-x-5">
          <span className="font-display font-medium text-ivory">{v.label}: {formatPrice(v.priceP)}</span>
          {!v.inStock && <span className="ml-2 text-muted uppercase text-[10px] tracking-wider">Sold out</span>}
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
            className={cx("rounded-none border px-2 py-0.5 font-caps text-[10px] uppercase tracking-wider transition-colors sm:text-[11px]", active === x.sku ? "border-gold text-gold bg-gold/10" : "border-line text-muted hover:border-gold/60", !x.inStock && "opacity-40")}
          >
            {x.label}
          </button>
        ))}
        {variants.length > shown.length && <span className="px-1 font-caps text-[10px] text-muted">+{variants.length - shown.length}</span>}
      </div>
    </>
  );
}
