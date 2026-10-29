"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Search, User } from "lucide-react";
import { useCurrentPath } from "@/lib/use-current-path";
import { Logo } from "@/components/brand/Logo";
import { CartButton } from "./CartButton";
import { MobileMenu } from "./MobileMenu";
import { MAIN_NAV } from "./nav";
import { SearchLink } from "@/components/search/SearchHost";
import { cn } from "@/lib/cn";

/**
 * Regal Architectural Haute-Parfumerie Header
 * - Top Tier: Grand Majestic Brand Lockup (Dead-Center), flanked by Atelier note & Client utilities
 * - Bottom Tier: Centered continuous navigation with all 6 signature Maison routes ("pass pass", simple & refined)
 * - Transitions smoothly on scroll with blurred obsidian backdrop and gold hairline accents
 */
export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const currentPath = useCurrentPath();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-40 w-full transition-all duration-500 ease-lux",
        scrolled
          ? "bg-bg/95 backdrop-blur-xl shadow-[0_12px_36px_rgba(0,0,0,0.85)] border-b border-gold/15"
          : "bg-gradient-to-b from-bg/95 via-bg/70 to-transparent backdrop-blur-[3px] border-b border-gold/10",
      )}
    >
      <div className="mx-auto max-w-[1360px] px-4 sm:px-6 lg:px-8">
        {/* Tier 1: Brand Emblem in Center & Utility Suite */}
        <div className="grid h-16 sm:h-18 lg:h-20 grid-cols-[1fr_auto_1fr] items-center">
          {/* Left Column: Mobile Menu Toggle / Atelier Badge */}
          <div className="flex items-center justify-start">
            <div className="lg:hidden">
              <MobileMenu />
            </div>
            <div className="hidden lg:flex items-center gap-2 font-caps text-xs tracking-[0.22em] text-gold uppercase select-none font-medium">
              <span className="size-1 rounded-full bg-gold/90 shadow-[0_0_6px_rgba(201,169,110,0.9)] animate-pulse" />
              <span>Haute Parfumerie · 28% Extrait</span>
            </div>
          </div>

          {/* Center Column: Grand Majestic Brand Lockup (Dead-Center) */}
          <div className="flex items-center justify-center px-2">
            <Link
              href="/"
              className="group flex flex-col items-center justify-center py-1 transition-all duration-300 focus-visible:outline-2 focus-visible:outline-gold"
              aria-label="Aaliqadr Maison de Parfum - Home"
            >
              {/* Brand Vectors Lockup */}
              <div className="flex items-center gap-2.5 sm:gap-3 text-gold transition-transform duration-500 ease-lux group-hover:scale-[1.02]">
                {/* Flame Monogram Mark (Alif + Qaf drop flame) with radiant golden aura */}
                <Logo
                  variant="mark"
                  className="h-7 sm:h-8 md:h-9 w-auto text-gold drop-shadow-[0_0_16px_rgba(201,169,110,0.5)] transition-all duration-300 group-hover:drop-shadow-[0_0_24px_rgba(201,169,110,0.75)]"
                />

                {/* 1px Vertical Gold Hairline Divider */}
                <span
                  aria-hidden
                  className="h-5 sm:h-6 md:h-7 w-[1px] bg-gradient-to-b from-transparent via-gold/50 to-transparent"
                />

                {/* Grand Aaliqadr Wordmark */}
                <Logo
                  variant="wordmark"
                  className="h-5 sm:h-6 md:h-7 w-auto text-ivory drop-shadow-[0_2px_12px_rgba(0,0,0,0.7)] transition-colors duration-300 group-hover:text-gold"
                />
              </div>

              {/* Quiet Luxury Maison Subtitle */}
              <span className="font-caps mt-1 text-[11px] sm:text-xs uppercase tracking-[0.28em] text-gold font-medium transition-colors duration-300 group-hover:text-gold">
                Maison de Parfum
              </span>
            </Link>
          </div>

          {/* Right Column: Search, Client Account, Shopping Bag */}
          <div className="flex items-center justify-end gap-2.5 sm:gap-3">
            {/* Search Button (High-Contrast Black & Gold) */}
            <SearchLink
              label="Search fragrances and rashis"
              title="Search fragrances and rashis (Press /)"
              className="group relative grid size-10 sm:size-11 min-h-[40px] min-w-[40px] sm:min-h-[44px] sm:min-w-[44px] place-items-center rounded-full border border-gold/40 bg-[#121016] text-gold/90 shadow-[0_4px_16px_rgba(0,0,0,0.6)] transition-all duration-300 ease-lux hover:-translate-y-0.5 hover:border-gold hover:bg-[#1A1622] hover:text-white hover:shadow-[0_0_18px_rgba(201,169,110,0.45)] active:translate-y-0 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-bg cursor-pointer"
            >
              <span className="sr-only">Search fragrances and rashis</span>
              <Search
                className="size-[17px] sm:size-[18px] stroke-[1.8] drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)] transition-transform duration-300 group-hover:scale-110"
                aria-hidden
              />
            </SearchLink>

            {/* Client Account Button (High-Contrast Black & Gold) */}
            <Link
              href="/account"
              title="Client Account & Orders"
              aria-label="Client Account"
              className="group relative grid size-10 sm:size-11 min-h-[40px] min-w-[40px] sm:min-h-[44px] sm:min-w-[44px] place-items-center rounded-full border border-gold/40 bg-[#121016] text-gold/90 shadow-[0_4px_16px_rgba(0,0,0,0.6)] transition-all duration-300 ease-lux hover:-translate-y-0.5 hover:border-gold hover:bg-[#1A1622] hover:text-white hover:shadow-[0_0_18px_rgba(201,169,110,0.45)] active:translate-y-0 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-bg cursor-pointer"
            >
              <User
                className="size-[17px] sm:size-[18px] stroke-[1.8] drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)] transition-transform duration-300 group-hover:scale-110"
                aria-hidden
              />
            </Link>

            {/* Shopping Bag Button with Real-time Count (Imperial Golden Saffron Jewel) */}
            <div className="relative">
              <CartButton />
            </div>
          </div>
        </div>

        {/* Tier 2: Desktop Navigation Bar (Centered, all 6 items together, simple & "pass pass") */}
        <div className="hidden lg:flex items-center justify-center border-t border-gold/15 py-2.5 sm:py-3">
          <nav
            aria-label="Primary Navigation"
            className="flex items-center gap-6 xl:gap-8 2xl:gap-9"
          >
            {MAIN_NAV.map((item) => {
              const isActive = currentPath ? (currentPath === item.href || (item.href !== "/" && currentPath.startsWith(item.href))) : false;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "group relative py-1 font-caps text-xs xl:text-[13px] uppercase tracking-[0.18em] xl:tracking-[0.20em] transition-colors duration-200 ease-lux focus-visible:outline-gold whitespace-nowrap",
                    isActive ? "text-gold font-semibold" : "text-ivory/90 font-medium hover:text-gold"
                  )}
                >
                  {/* Luminous golden ambient aura */}
                  <span
                    aria-hidden
                    className={cn(
                      "pointer-events-none absolute -inset-x-2 -inset-y-0.5 rounded-full bg-gold/[0.04] transition-opacity duration-200 ease-lux",
                      isActive ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                    )}
                  />

                  {/* Nav Link text (Simple, clean, dignified) */}
                  <span className="relative z-10 transition-colors duration-200 group-hover:text-gold">
                    {item.label}
                  </span>

                  {/* Center-expanding gold hairline indicator */}
                  <span
                    aria-hidden
                    className={cn(
                      "absolute -bottom-1 left-1/2 h-[1.5px] -translate-x-1/2 bg-gradient-to-r from-transparent via-gold to-transparent transition-all duration-300 ease-lux",
                      isActive ? "w-full opacity-100" : "w-0 opacity-0 group-hover:w-full group-hover:opacity-100"
                    )}
                  />

                  {/* Golden starlight micro-point */}
                  <span
                    aria-hidden
                    className={cn(
                      "absolute -bottom-[2.5px] left-1/2 size-1 -translate-x-1/2 rounded-full bg-gold shadow-[0_0_8px_rgba(201,169,110,0.95)] transition-all duration-300 ease-lux",
                      isActive ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                    )}
                  />
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </header>
  );
}
