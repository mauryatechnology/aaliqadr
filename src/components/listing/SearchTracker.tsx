"use client";

import { useEffect } from "react";
import { trackSearchAction } from "@/actions/search";
import { SEARCH_TRAIL } from "@/lib/cart-store";

export const RECENT_SEARCHES = "aq.recent-searches";
const RECENT = RECENT_SEARCHES;

/** Remembers a search (this browser only) and logs it anonymously, plus clicks on its results. */
export function SearchTracker({ q, results }: { q: string; results: number }) {
  useEffect(() => {
    if (!q) return;
    void trackSearchAction({ q, event: "search", results });
    try {
      const prev = JSON.parse(localStorage.getItem(RECENT) ?? "[]") as string[];
      localStorage.setItem(RECENT, JSON.stringify([q, ...prev.filter((x) => x.toLowerCase() !== q.toLowerCase())].slice(0, 6)));
    } catch {
      // ignore
    }
    const onClick = (e: MouseEvent) => {
      const a = (e.target as HTMLElement).closest?.('a[href^="/perfume/"]') as HTMLAnchorElement | null;
      if (!a?.closest("[data-search-results]")) return;
      const slug = new URL(a.href).pathname.split("/")[2] ?? "";
      void trackSearchAction({ q, event: "click", slug });
      try {
        sessionStorage.setItem(SEARCH_TRAIL, JSON.stringify({ q, slug, at: Date.now() }));
      } catch {
        // ignore
      }
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [q, results]);
  return null;
}
