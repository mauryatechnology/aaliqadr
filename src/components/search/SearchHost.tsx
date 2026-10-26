"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useState } from "react";

/**
 * Opens the storefront search overlay (plan.md §9.2) from the header, the mobile nav or the `/`
 * key. The overlay's code loads on first use only; without JavaScript the triggers are plain
 * links to /search.
 */

const SearchOverlay = dynamic(() => import("./SearchOverlay").then((m) => m.SearchOverlay), { ssr: false });
const OPEN = "aq:open-search";

export function openSearch() {
  window.dispatchEvent(new Event(OPEN));
}

export function SearchHost({ popular }: { popular: string[] }) {
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    const show = () => {
      setLoaded(true);
      setOpen(true);
    };
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey || t.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName)) return;
      e.preventDefault();
      show();
    };
    window.addEventListener(OPEN, show);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener(OPEN, show);
      window.removeEventListener("keydown", onKey);
    };
  }, []);
  return loaded ? <SearchOverlay open={open} onClose={() => setOpen(false)} popular={popular} /> : null;
}

/** A link to /search that opens the overlay instead when JavaScript is running. */
export function SearchLink({ className, children, label = "Search" }: { className?: string; children: React.ReactNode; label?: string }) {
  return (
    <Link
      href="/search"
      aria-label={label}
      className={className}
      onClick={(e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
        e.preventDefault();
        openSearch();
      }}
    >
      {children}
    </Link>
  );
}
