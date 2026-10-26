import Link from "next/link";
import { Search, User } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { CartButton } from "./CartButton";
import { MobileMenu } from "./MobileMenu";
import { MAIN_NAV } from "./nav";
import { SearchLink } from "@/components/search/SearchHost";

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-white/5 bg-[color-mix(in_oklab,var(--z-bg)_72%,transparent)] backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-[1360px] items-center justify-between gap-4 px-4 sm:px-6 lg:h-20">
        <div className="flex items-center gap-1 lg:hidden">
          <MobileMenu />
        </div>
        <Link href="/" className="flex h-10 items-center lg:h-12" aria-label="Aaliqadr home">
          <Logo variant="horizontal" className="hidden h-full sm:inline-flex" />
          <Logo variant="mark" className="h-10 sm:hidden" />
        </Link>
        <nav aria-label="Main" className="hidden items-center gap-8 lg:flex">
          {MAIN_NAV.map((item) => (
            <Link key={item.href} href={item.href} className="font-caps text-[0.7rem] uppercase tracking-[0.24em] text-fg/80 transition-colors hover:text-gold">
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center">
          <SearchLink className="grid size-11 place-items-center rounded-full text-fg transition-colors hover:text-gold">
            <Search className="size-5" strokeWidth={1.5} />
          </SearchLink>
          <Link href="/account" className="hidden size-11 place-items-center rounded-full text-fg transition-colors hover:text-gold sm:grid" aria-label="Your account">
            <User className="size-5" strokeWidth={1.5} />
          </Link>
          <CartButton />
        </div>
      </div>
    </header>
  );
}
