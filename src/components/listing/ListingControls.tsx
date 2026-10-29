"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { Route } from "next";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { SlidersHorizontal, X } from "lucide-react";

/** The only client parts of a listing: the sort select and the mobile filter sheet. */

export function SortSelect({
  value,
  options,
}: {
  value: string;
  options: { value: string; label: string }[];
}) {
  const router = useRouter();
  const path = usePathname();
  const sp = useSearchParams();
  return (
    <div className="flex items-center gap-2.5">
      <span className="font-caps text-[10px] uppercase tracking-[0.22em] text-muted">
        Sort By
      </span>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => {
            const next = new URLSearchParams(sp);
            if (e.target.value) next.set("sort", e.target.value);
            else next.delete("sort");
            next.delete("page");
            router.replace(`${path}${next.size ? `?${next}` : ""}` as Route, { scroll: false });
          }}
          className="min-h-[40px] appearance-none rounded-xl border border-gold/30 bg-surface/90 py-2 pl-3.5 pr-8 font-caps text-[11px] uppercase tracking-[0.16em] text-ivory transition-all duration-200 hover:border-gold focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold/30 cursor-pointer [&>option]:bg-surface [&>option]:text-ivory"
        >
          {options.map((o) => (
            <option
              key={o.value}
              value={o.value}
              className="bg-surface text-ivory py-1 font-sans normal-case tracking-normal"
            >
              {o.label}
            </option>
          ))}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2.5 text-gold/80">
          <svg className="size-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
    </div>
  );
}

/**
 * Desktop: the filter rail, sticky beside the grid with custom hidden scrollbars.
 * Phones: an elegant button opening the filters in a luxury sheet.
 */
export function FilterSheet({
  children,
  count,
  activeCount,
  clearHref,
}: {
  children: React.ReactNode;
  count: number;
  activeCount: number;
  clearHref: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDialogElement>(null);
  const sp = useSearchParams();
  // A filter link navigates; keep the sheet open so several can be ticked, but follow the URL.
  const key = sp.toString();
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <>
      <aside aria-label="Filters" className="hidden lg:block w-[260px] shrink-0">
        <div className="sticky top-28 max-h-[calc(100dvh-8rem)] overflow-y-auto pr-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {children}
        </div>
      </aside>
      <div className="lg:hidden mb-4">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-gold/35 bg-surface/90 px-5 py-2.5 font-caps text-xs uppercase tracking-[0.2em] text-gold transition-all duration-300 hover:border-gold hover:bg-gold/10 active:scale-98 shadow-sm"
        >
          <SlidersHorizontal className="size-3.5 text-gold" aria-hidden /> Filter Creations
          {activeCount ? ` (${activeCount})` : ""}
        </button>
        <dialog
          ref={ref}
          onClose={() => setOpen(false)}
          aria-label="Filter and sort"
          className="m-0 h-dvh max-h-dvh w-full max-w-full bg-surface p-0 text-ivory backdrop:bg-black/75 backdrop:backdrop-blur-sm"
        >
          {open && (
            <div key={key} className="flex h-full flex-col">
              <div className="flex items-center justify-between border-b border-gold/15 bg-bg px-5 py-4">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-gold">✦</span>
                  <p className="font-caps text-xs uppercase tracking-[0.22em] text-gold font-medium">
                    Filter & Refine
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Close filters"
                  className="grid size-11 place-items-center rounded-full text-muted hover:text-ivory transition-colors"
                >
                  <X className="size-5" />
                </button>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto p-5 [scrollbar-width:thin]">
                {children}
              </div>
              <div className="flex gap-3 border-t border-gold/15 bg-bg/95 p-4 backdrop-blur-md">
                <Link
                  href={clearHref as Route}
                  scroll={false}
                  className="flex-1 min-h-[44px] inline-flex items-center justify-center rounded-xl border border-line py-2.5 text-center font-caps text-xs uppercase tracking-[0.18em] text-muted hover:border-gold/40 hover:text-ivory transition-all active:scale-98"
                >
                  Clear All
                </Link>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="btn-gold flex-[2] min-h-[44px] rounded-xl py-2.5 font-caps text-xs uppercase tracking-[0.2em]"
                >
                  Show {count} result{count === 1 ? "" : "s"}
                </button>
              </div>
            </div>
          )}
        </dialog>
      </div>
    </>
  );
}
