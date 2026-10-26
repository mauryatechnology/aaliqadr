"use client";

import { useSyncExternalStore } from "react";

/**
 * Hearts in this browser (plan.md §11.3). Guests keep their wishlist here; signed-in customers'
 * lists live on the server too, and the account page merges the two.
 */

const KEY = "aq-wishlist-v1";
const listeners = new Set<() => void>();
let snapshot: string[] | null = null;
const EMPTY: string[] = [];

function read(): string[] {
  if (snapshot) return snapshot;
  try {
    snapshot = (JSON.parse(localStorage.getItem(KEY) ?? "[]") as string[]).filter((s) => typeof s === "string").slice(0, 200);
  } catch {
    snapshot = [];
  }
  return snapshot;
}

function write(next: string[]) {
  snapshot = [...new Set(next)].slice(0, 200);
  try {
    localStorage.setItem(KEY, JSON.stringify(snapshot));
  } catch {
    // Storage full or blocked: the heart still reflects this page view.
  }
  listeners.forEach((l) => l());
}

export const wishlist = {
  has: (slug: string) => read().includes(slug),
  toggle(slug: string): boolean {
    const on = !read().includes(slug);
    write(on ? [slug, ...read()] : read().filter((s) => s !== slug));
    return on;
  },
  replace: (slugs: string[]) => write(slugs),
  all: () => read(),
};

const subscribe = (l: () => void) => {
  listeners.add(l);
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) {
      snapshot = null;
      l();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(l);
    window.removeEventListener("storage", onStorage);
  };
};

export function useWishlist(): string[] {
  return useSyncExternalStore(subscribe, read, () => EMPTY);
}
