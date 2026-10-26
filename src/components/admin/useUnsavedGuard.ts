"use client";

import { useEffect } from "react";

/** Warns before the tab closes or reloads while an editor has unsaved changes (plan.md B6). */
export function useUnsavedGuard(dirty: boolean) {
  useEffect(() => {
    if (!dirty) return;
    const before = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", before);
    return () => window.removeEventListener("beforeunload", before);
  }, [dirty]);
}
