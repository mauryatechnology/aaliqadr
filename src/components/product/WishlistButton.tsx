"use client";

import { toggleWishlistAction } from "@/actions/wishlist";
import { useWishlist, wishlist } from "@/lib/wishlist-store";
import { cx } from "@/lib/cx";

function HeartIcon({ className, fill, strokeWidth }: { className?: string; fill?: string; strokeWidth?: number }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill={fill ?? "none"} stroke="currentColor" strokeWidth={strokeWidth ?? 2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 9.5a5.5 5.5 0 0 1 9.591-3.676.56.56 0 0 0 .818 0A5.49 5.49 0 0 1 22 9.5c0 2.29-1.5 4-3 5.5l-5.492 5.313a2 2 0 0 1-3 .019L5 15c-1.5-1.5-3-3.2-3-5.5" />
    </svg>
  );
}

/** Heart on cards and product pages (plan.md §10.1, §11.3). Works for guests. */
export function WishlistButton({ slug, name, className, size = "sm" }: { slug: string; name: string; className?: string; size?: "sm" | "lg" }) {
  const list = useWishlist();
  const on = list.includes(slug);
  return (
    <button
      type="button"
      aria-pressed={on}
      aria-label={on ? `Remove ${name} from your wishlist` : `Save ${name} to your wishlist`}
      onClick={() => {
        const next = wishlist.toggle(slug);
        void toggleWishlistAction(slug, next).catch(() => undefined);
      }}
      className={cx(
        "grid place-items-center rounded-full transition-colors",
        size === "sm" ? "size-11 min-h-[44px] min-w-[44px] bg-black/55 text-ivory backdrop-blur hover:bg-black/75 hover:scale-105 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold" : "size-12 min-h-[48px] min-w-[48px] border border-white/20 hover:border-gold hover:scale-105 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold",
        on && "text-gold",
        className,
      )}
    >
      <HeartIcon className={size === "sm" ? "size-4" : "size-5"} fill={on ? "currentColor" : "none"} strokeWidth={1.8} />
    </button>
  );
}
