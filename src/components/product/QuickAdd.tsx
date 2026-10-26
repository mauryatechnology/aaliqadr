"use client";

import { useEffect, useRef, useState } from "react";
import { ShoppingBag, X } from "lucide-react";
import { cart } from "@/lib/cart-store";
import { formatPrice } from "@/lib/money";
import type { ProductCardDTO } from "@/server/catalog/types";

/**
 * The card's quick-add button (plan.md §10.5): the only client code on a product card.
 * One variant → straight into the bag. Several → a small size sheet, so nobody gets a
 * size they didn't choose, and sold-out sizes can't be picked.
 */
export function QuickAdd({ product }: { product: Pick<ProductCardDTO, "slug" | "name" | "defaultSku" | "quickVariants"> }) {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const variants = product.quickVariants;
  const multi = variants.length > 1;

  useEffect(() => {
    if (!open) return;
    panelRef.current?.querySelector<HTMLButtonElement>("button:not([disabled])")?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    const onDown = (e: MouseEvent) => {
      if (!panelRef.current?.contains(e.target as Node) && !buttonRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onDown);
    };
  }, [open]);

  if (!product.defaultSku) return null;

  function add(sku: string) {
    const v = variants.find((x) => x.sku === sku);
    if (!v?.inStock) return;
    cart.add({ sku, slug: product.slug }, 1, v.maxPerOrder);
    setOpen(false);
  }

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => (multi ? setOpen((o) => !o) : add(product.defaultSku!))}
        aria-label={multi ? `Choose a size of ${product.name} to add to bag` : `Add ${product.name} to bag`}
        aria-haspopup={multi ? "dialog" : undefined}
        aria-expanded={multi ? open : undefined}
        className="absolute bottom-2.5 right-2.5 z-20 grid size-9 place-items-center rounded-full bg-gold text-obsidian shadow-lg transition-all duration-300 hover:scale-110 hover:bg-gold-light focus-visible:opacity-100 active:scale-95 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100"
      >
        <ShoppingBag className="size-4" strokeWidth={2} aria-hidden />
      </button>
      {open && (
        <div ref={panelRef} role="dialog" aria-label={`Sizes of ${product.name}`} className="surface absolute inset-x-2 bottom-2 z-30 flex flex-col gap-1.5 p-3">
          <div className="flex items-center justify-between">
            <p className="eyebrow !text-[0.6rem]">Choose a size</p>
            <button type="button" aria-label="Close" onClick={() => setOpen(false)} className="rounded-full p-1 text-muted hover:text-fg">
              <X className="size-4" />
            </button>
          </div>
          {variants.map((v) => (
            <button
              key={v.sku}
              type="button"
              disabled={!v.inStock}
              onClick={() => add(v.sku)}
              className="flex items-center justify-between gap-2 rounded-lg border border-white/10 px-3 py-2 text-left text-xs transition-colors hover:border-gold/60 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <span className={v.inStock ? "" : "line-through"}>{v.label}</span>
              <span className="text-muted">{v.inStock ? formatPrice(v.priceP) : "Sold out"}</span>
            </button>
          ))}
        </div>
      )}
    </>
  );
}
