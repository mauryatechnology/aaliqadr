"use client";

import { useSyncExternalStore } from "react";

/**
 * Guest cart in localStorage (docs/07 §1). Holds SKUs and quantities only, never prices: the
 * server prices the cart from the database on every read. Merged into the server cart on login.
 */

export interface CartLine {
  sku: string;
  slug: string;
  qty: number;
}

const KEY = "aq-cart-v1";
const MAX_QTY = 5;
const EMPTY: CartLine[] = [];
const listeners = new Set<() => void>();
let snapshot: CartLine[] | null = null;

function read(): CartLine[] {
  if (snapshot) return snapshot;
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    snapshot = Array.isArray(parsed)
      ? parsed.filter((l): l is CartLine => typeof l?.sku === "string" && typeof l?.slug === "string" && Number.isInteger(l?.qty) && l.qty > 0)
      : [];
  } catch {
    snapshot = [];
  }
  return snapshot;
}

function write(lines: CartLine[]) {
  snapshot = lines;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(lines));
  } catch {
    // Private mode / storage full: the cart still works for this tab.
  }
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) {
      snapshot = null;
      cb();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", onStorage);
  };
}

const drawerListeners = new Set<() => void>();
let isDrawerOpen = false;

function notifyDrawer(open: boolean) {
  if (isDrawerOpen === open) return;
  isDrawerOpen = open;
  drawerListeners.forEach((l) => l());
}

/**
 * Search → add-to-bag analytics (plan.md §9.2): if this product was reached from a search in
 * the last 30 minutes, count the add against that query. The action loads only then.
 */
export const SEARCH_TRAIL = "aq.search-trail";
function attributeToSearch(slug: string) {
  try {
    const trail = JSON.parse(sessionStorage.getItem(SEARCH_TRAIL) ?? "null") as { q: string; slug: string; at: number } | null;
    if (!trail || trail.slug !== slug || Date.now() - trail.at > 30 * 60_000) return;
    sessionStorage.removeItem(SEARCH_TRAIL);
    void import("@/actions/search").then((m) => m.trackSearchAction({ q: trail.q, event: "add", slug }));
  } catch {
    // Storage blocked: no attribution.
  }
}

export const cart = {
  openDrawer() {
    notifyDrawer(true);
  },
  closeDrawer() {
    notifyDrawer(false);
  },
  toggleDrawer() {
    notifyDrawer(!isDrawerOpen);
  },
  add(line: Omit<CartLine, "qty">, qty = 1, maxQty = MAX_QTY, autoOpen = true) {
    const lines = read();
    const existing = lines.find((l) => l.sku === line.sku);
    const next = existing
      ? lines.map((l) => (l.sku === line.sku ? { ...l, qty: Math.min(l.qty + qty, maxQty) } : l))
      : [...lines, { ...line, qty: Math.min(qty, maxQty) }];
    write(next);
    attributeToSearch(line.slug);
    if (autoOpen) {
      notifyDrawer(true);
    }
  },
  setQty(sku: string, qty: number) {
    write(qty <= 0 ? read().filter((l) => l.sku !== sku) : read().map((l) => (l.sku === sku ? { ...l, qty: Math.min(qty, MAX_QTY) } : l)));
  },
  clear() {
    write([]);
  },
};

export function useCart(): CartLine[] {
  return useSyncExternalStore(subscribe, read, () => EMPTY);
}

export function useCartCount(): number {
  return useCart().reduce((n, l) => n + l.qty, 0);
}

export function useCartDrawer(): [boolean, (open: boolean) => void] {
  const open = useSyncExternalStore(
    (cb) => {
      drawerListeners.add(cb);
      return () => {
        drawerListeners.delete(cb);
      };
    },
    () => isDrawerOpen,
    () => false
  );
  return [open, notifyDrawer];
}
