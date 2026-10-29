"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { cn } from "@/lib/cn";

export function ShopCategoryPills() {
  const sp = useSearchParams();
  const currentCat = sp.get("category");

  const isAll = !currentCat;
  const isZodiac = currentCat === "zodiac-extraits";
  const isSets = currentCat === "discovery-sets";

  return (
    <div className="mt-7 flex flex-wrap items-center justify-center gap-2.5 sm:gap-3.5">
      <Link
        href="/shop"
        scroll={false}
        className={cn(
          "inline-flex min-h-[40px] items-center rounded-full border px-5 py-2 font-caps text-xs uppercase tracking-[0.16em] transition-all duration-300 active:scale-98 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold",
          isAll
            ? "border-gold bg-gold text-obsidian font-semibold shadow-[0_0_14px_rgba(201,169,110,0.4)]"
            : "border-gold/30 bg-surface/70 text-ivory/85 hover:border-gold hover:bg-gold/10 hover:text-gold"
        )}
      >
        All Creations
      </Link>
      <Link
        href="/shop?category=zodiac-extraits"
        scroll={false}
        className={cn(
          "inline-flex min-h-[40px] items-center rounded-full border px-5 py-2 font-caps text-xs uppercase tracking-[0.16em] transition-all duration-300 active:scale-98 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold",
          isZodiac
            ? "border-gold bg-gold text-obsidian font-semibold shadow-[0_0_14px_rgba(201,169,110,0.4)]"
            : "border-gold/30 bg-surface/70 text-ivory/85 hover:border-gold hover:bg-gold/10 hover:text-gold"
        )}
      >
        12 Zodiac Extraits
      </Link>
      <Link
        href="/shop?category=discovery-sets"
        scroll={false}
        className={cn(
          "inline-flex min-h-[40px] items-center rounded-full border px-5 py-2 font-caps text-xs uppercase tracking-[0.16em] transition-all duration-300 active:scale-98 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold",
          isSets
            ? "border-gold bg-gold text-obsidian font-semibold shadow-[0_0_14px_rgba(201,169,110,0.4)]"
            : "border-gold/30 bg-surface/70 text-ivory/85 hover:border-gold hover:bg-gold/10 hover:text-gold"
        )}
      >
        Discovery Coffret (12 x 2ml)
      </Link>
      <Link
        href="/find-my-sign"
        className="inline-flex min-h-[40px] items-center gap-1.5 rounded-full border border-gold/40 bg-gold/10 px-5 py-2 font-caps text-xs uppercase tracking-[0.16em] text-gold transition-all duration-300 hover:border-gold hover:bg-gold/20 active:scale-98 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
      >
        <span className="text-[10px]">✦</span>
        <span>Find My Sign</span>
      </Link>
    </div>
  );
}

export function ShopCategoryPillsSkeleton() {
  return (
    <div className="mt-7 flex flex-wrap items-center justify-center gap-2.5 sm:gap-3.5" aria-hidden>
      <div className="h-10 w-32 rounded-full border border-gold/30 bg-gold/10 animate-pulse" />
      <div className="h-10 w-44 rounded-full border border-gold/20 bg-surface/60 animate-pulse" />
      <div className="h-10 w-48 rounded-full border border-gold/20 bg-surface/60 animate-pulse" />
      <div className="h-10 w-36 rounded-full border border-gold/20 bg-surface/60 animate-pulse" />
    </div>
  );
}

