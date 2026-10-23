"use client";

import Link from "next/link";
import { useRef } from "react";
import { Menu, X } from "lucide-react";
import { SIGNS } from "@/config/zodiac";
import { routes } from "@/lib/routes";
import { MAIN_NAV } from "./nav";

/** Native <dialog>: modal focus trap, Esc to close and inert background with no library. */
export function MobileMenu() {
  const ref = useRef<HTMLDialogElement>(null);
  const close = () => ref.current?.close();
  return (
    <>
      <button type="button" onClick={() => ref.current?.showModal()} className="grid size-11 place-items-center rounded-full text-fg lg:hidden" aria-label="Open menu" aria-haspopup="dialog">
        <Menu className="size-5" strokeWidth={1.5} />
      </button>
      <dialog
        ref={ref}
        aria-label="Menu"
        onClick={(e) => e.target === ref.current && close()}
        className="m-0 h-dvh max-h-none w-[86vw] max-w-sm bg-obsidian p-0 text-ivory shadow-2xl backdrop:bg-black/60 backdrop:backdrop-blur-sm"
      >
        <div className="flex min-h-full flex-col gap-8 overflow-y-auto p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
          <div className="flex items-center justify-between">
            <p className="eyebrow">Menu</p>
            <button type="button" onClick={close} className="grid size-11 place-items-center rounded-full" aria-label="Close menu">
              <X className="size-5" strokeWidth={1.5} />
            </button>
          </div>
          <nav className="flex flex-col gap-1" aria-label="Mobile">
            {MAIN_NAV.map((item) => (
              <Link key={item.href} href={item.href} onClick={close} className="font-display py-2 text-3xl transition-colors hover:text-gold">
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="hairline" />
          <div className="grid grid-cols-4 gap-2">
            {SIGNS.map((s) => (
              <Link key={s.slug} href={routes.sign(s.slug)} onClick={close} data-zodiac={s.slug} className="flex flex-col items-center gap-1 rounded-xl py-3 text-xs transition-colors hover:bg-white/5">
                <span className="text-2xl" style={{ color: "var(--z-primary)" }} aria-hidden>
                  {s.glyph}
                  {"︎"}
                </span>
                {s.name}
              </Link>
            ))}
          </div>
        </div>
      </dialog>
    </>
  );
}
