"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { Route } from "next";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { SlidersHorizontal, X } from "lucide-react";

/** The only client parts of a listing: the sort select and the mobile filter sheet. */

export function SortSelect({ value, options }: { value: string; options: { value: string; label: string }[] }) {
  const router = useRouter();
  const path = usePathname();
  const sp = useSearchParams();
  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="text-muted">Sort</span>
      <select
        value={value}
        onChange={(e) => {
          const next = new URLSearchParams(sp);
          if (e.target.value) next.set("sort", e.target.value);
          else next.delete("sort");
          next.delete("page");
          router.replace(`${path}${next.size ? `?${next}` : ""}` as Route, { scroll: false });
        }}
        className="rounded-full border border-white/15 bg-transparent px-3 py-1.5 text-sm text-fg [&>option]:bg-[var(--z-bg)]"
      >
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  );
}

/**
 * Desktop: the filter rail, sticky beside the grid. Phones: a "Filter & sort" button opening the
 * same filters in a full-height sheet with a "Show N results" button.
 */
export function FilterSheet({ children, count, activeCount, clearHref }: { children: React.ReactNode; count: number; activeCount: number; clearHref: string }) {
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
      <aside aria-label="Filters" className="hidden lg:block">
        <div className="sticky top-24 max-h-[calc(100dvh-7rem)] overflow-y-auto pr-2 [scrollbar-width:thin]">{children}</div>
      </aside>
      <div className="lg:hidden">
        <button type="button" onClick={() => setOpen(true)} className="inline-flex items-center gap-2 rounded-full border border-white/20 px-4 py-2 text-xs uppercase tracking-[0.18em]">
          <SlidersHorizontal className="size-4" aria-hidden /> Filter & sort{activeCount ? ` (${activeCount})` : ""}
        </button>
        <dialog ref={ref} onClose={() => setOpen(false)} aria-label="Filter and sort" className="m-0 h-dvh max-h-dvh w-full max-w-full bg-[var(--z-bg)] p-0 text-fg backdrop:bg-black/60">
          {open && (
            <div key={key} className="flex h-full flex-col">
              <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
                <p className="font-caps text-xs uppercase tracking-[0.2em]">Filters</p>
                <button type="button" onClick={() => setOpen(false)} aria-label="Close filters" className="rounded-full p-2 hover:bg-white/5"><X className="size-5" /></button>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto px-4">{children}</div>
              <div className="flex gap-3 border-t border-white/10 p-4">
                <Link href={clearHref as Route} scroll={false} className="flex-1 rounded-full border border-white/20 py-3 text-center text-xs uppercase tracking-[0.18em]">Clear</Link>
                <button type="button" onClick={() => setOpen(false)} className="btn-gold flex-[2] rounded-full py-3 text-xs uppercase tracking-[0.18em]">Show {count} result{count === 1 ? "" : "s"}</button>
              </div>
            </div>
          )}
        </dialog>
      </div>
    </>
  );
}
