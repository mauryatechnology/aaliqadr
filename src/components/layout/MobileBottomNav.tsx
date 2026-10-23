import Link from "next/link";
import type { Route } from "next";
import { Compass, Home, Search, Sparkles } from "lucide-react";
import { CartButton } from "./CartButton";

const ITEMS: { href: Route; label: string; Icon: typeof Home }[] = [
  { href: "/", label: "Home", Icon: Home },
  { href: "/zodiac", label: "Zodiac", Icon: Sparkles },
  { href: "/shop", label: "Shop", Icon: Compass },
  { href: "/search", label: "Search", Icon: Search },
];

/** Thumb-reach navigation on phones (docs/09 §5). */
export function MobileBottomNav() {
  return (
    <nav
      aria-label="Quick"
      className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-around border-t border-white/10 bg-[color-mix(in_oklab,var(--z-bg)_80%,transparent)] pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden"
    >
      {ITEMS.map(({ href, label, Icon }) => (
        <Link key={href} href={href} className="flex min-w-14 flex-col items-center gap-0.5 py-2 text-[10px] text-fg/75 hover:text-gold">
          <Icon className="size-5" strokeWidth={1.5} aria-hidden />
          {label}
        </Link>
      ))}
      <div className="flex min-w-14 flex-col items-center text-[10px] text-fg/75">
        <CartButton />
      </div>
    </nav>
  );
}
