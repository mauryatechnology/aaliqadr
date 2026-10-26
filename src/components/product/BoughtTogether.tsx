"use client";

import { useState } from "react";
import { cart } from "@/lib/cart-store";
import { formatPrice } from "@/lib/money";

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12h14" />
      <path d="M12 5v14" />
    </svg>
  );
}

/** "Add both to bag" for frequently-bought-together items (plan.md §10.3). */
export function AddTogether({ items }: { items: { slug: string; sku: string; name: string; priceP: number; maxPerOrder: number }[] }) {
  const [done, setDone] = useState(false);
  const total = items.reduce((n, i) => n + i.priceP, 0);
  return (
    <div className="flex flex-wrap items-center gap-4">
      <p className="text-sm">
        Together: <span className="font-medium">{formatPrice(total)}</span>
      </p>
      <button
        type="button"
        onClick={() => {
          items.forEach((i, n) => cart.add({ sku: i.sku, slug: i.slug }, 1, i.maxPerOrder, n === items.length - 1));
          setDone(true);
        }}
        className="btn-gold inline-flex h-11 items-center gap-2 rounded-full px-5 text-xs uppercase tracking-[0.18em]"
      >
        {done ? <CheckIcon className="size-4" /> : <PlusIcon className="size-4" />} {done ? "Added" : `Add ${items.length === 2 ? "both" : `all ${items.length}`} to bag`}
      </button>
    </div>
  );
}
