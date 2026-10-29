"use client";

import Link from "next/link";
import { useRef } from "react";
import { useCurrentPath } from "@/lib/use-current-path";
import { cn } from "@/lib/cn";
import { Logo } from "@/components/brand/Logo";
import { Glyph } from "@/components/zodiac/Glyph";
import { SIGNS, type ZodiacSlug } from "@/config/zodiac";
import { routes } from "@/lib/routes";
import { MAIN_NAV } from "./nav";

/** Native <dialog>: modal focus trap, Esc to close and inert background with no library. */
export function MobileMenu() {
  const ref = useRef<HTMLDialogElement>(null);
  const currentPath = useCurrentPath();
  const close = () => ref.current?.close();

  return (
    <>
      <button
        type="button"
        onClick={() => ref.current?.showModal()}
        className="grid size-10 sm:size-11 min-h-[40px] min-w-[40px] sm:min-h-[44px] sm:min-w-[44px] place-items-center rounded-full border border-[#D4AF37]/50 bg-gradient-to-b from-[#2E2010] via-[#1E1508] to-[#120C04] text-[#F3CF7A] shadow-[inset_0_1px_1px_rgba(246,216,132,0.35),0_4px_12px_rgba(0,0,0,0.55)] transition-all duration-300 ease-lux hover:-translate-y-0.5 hover:border-[#F6D884] hover:bg-gradient-to-b hover:from-[#3D2C17] hover:to-[#1A1206] hover:text-white hover:shadow-[0_0_20px_rgba(212,175,55,0.5),inset_0_1px_2px_rgba(255,255,255,0.4)] active:scale-95 lg:hidden cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
        aria-label="Open boutique menu"
        aria-haspopup="dialog"
      >
        <svg
          className="size-5 stroke-[1.8] drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <line x1="3" y1="7" x2="21" y2="7" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="17" x2="21" y2="17" />
        </svg>
      </button>

      <dialog
        ref={ref}
        aria-label="Menu"
        onClick={(e) => e.target === ref.current && close()}
        className="m-0 h-dvh max-h-none w-[88vw] max-w-sm bg-obsidian p-0 text-ivory shadow-2xl backdrop:bg-black/75 backdrop:backdrop-blur-md"
      >
        <div className="flex min-h-full flex-col gap-8 overflow-y-auto p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
          {/* Header Drawer Brand Header */}
          <div className="flex items-center justify-between border-b border-gold/15 pb-4">
            <div className="flex items-center gap-2.5">
              <Logo variant="mark" className="h-7 w-auto text-gold" />
              <span aria-hidden className="h-4 w-px bg-gold/40" />
              <Logo variant="wordmark" className="h-4 w-auto text-ivory" />
            </div>

            <button
              type="button"
              onClick={close}
              className="grid size-11 min-h-[44px] min-w-[44px] place-items-center rounded-full text-ivory/80 hover:text-gold hover:bg-white/10 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold transition-all duration-200 cursor-pointer"
              aria-label="Close menu"
            >
              <svg
                className="size-5 stroke-[1.25]"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.25"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <path d="M18 6 6 18" />
                <path d="m6 6 12 12" />
              </svg>
            </button>
          </div>

          {/* Primary Navigation Links */}
          <nav className="flex flex-col gap-1" aria-label="Mobile Navigation">
            {MAIN_NAV.map((item) => {
              const isActive = currentPath ? (currentPath === item.href || (item.href !== "/" && currentPath.startsWith(item.href))) : false;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={close}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "font-display py-2.5 text-2xl font-light transition-colors flex items-center justify-between",
                    isActive ? "text-gold font-normal" : "text-ivory hover:text-gold"
                  )}
                >
                  <span>{item.label}</span>
                  {isActive && <span className="size-1.5 rounded-full bg-gold shadow-[0_0_8px_rgba(201,169,110,0.9)]" />}
                </Link>
              );
            })}
          </nav>

          <div className="hairline" />

          {/* The 12 Signs Grid */}
          <div>
            <p className="eyebrow text-gold/80 mb-3">The 12 Signs</p>
            <div className="grid grid-cols-3 gap-2">
              {SIGNS.map((s) => (
                <Link
                  key={s.slug}
                  href={routes.sign(s.slug)}
                  onClick={close}
                  data-zodiac={s.slug}
                  className="flex min-h-[54px] flex-col items-center justify-center gap-1 rounded-lg border border-gold/20 bg-surface/75 p-3 text-center transition-colors hover:border-gold/50 hover:bg-gold/15 active:scale-95"
                >
                  <div className="text-gold">
                    <Glyph sign={s.slug as ZodiacSlug} className="size-5" label={false} />
                  </div>
                  <span className="font-caps text-[11px] font-medium uppercase tracking-wider text-ivory">
                    {s.name}
                  </span>
                  <span className="font-rashi text-[11px] text-gold-soft font-normal">
                    {s.rashi}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </dialog>
    </>
  );
}
