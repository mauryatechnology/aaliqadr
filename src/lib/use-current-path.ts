"use client";

import { useSyncExternalStore } from "react";

function subscribe(callback: () => void) {
  window.addEventListener("popstate", callback);
  return () => window.removeEventListener("popstate", callback);
}

function getSnapshot() {
  return window.location.pathname;
}

function getServerSnapshot() {
  return "";
}

/**
 * React 19 idiomatic hook to read current pathname without blocking Next.js SSR/prerender.
 * Uses useSyncExternalStore with empty server snapshot.
 */
export function useCurrentPath(): string {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

