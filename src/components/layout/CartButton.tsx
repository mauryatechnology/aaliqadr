"use client";

import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { useCartCount } from "@/lib/cart-store";

export function CartButton() {
  const count = useCartCount();
  return (
    <Link
      href="/cart"
      className="relative grid size-11 place-items-center rounded-full text-fg transition-colors hover:text-gold"
      aria-label={count ? `Bag, ${count} item${count > 1 ? "s" : ""}` : "Bag, empty"}
    >
      <ShoppingBag className="size-5" strokeWidth={1.5} />
      {count > 0 && (
        <span aria-hidden className="absolute right-1 top-1 grid min-w-4 place-items-center rounded-full bg-gold px-1 text-[10px] font-semibold leading-4 text-obsidian">
          {count}
        </span>
      )}
    </Link>
  );
}
