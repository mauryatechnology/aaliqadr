"use client";

import { useEffect } from "react";

/**
 * Lenis smooth scroll for desktop pointers only. Off on touch devices, reduced motion,
 * Save-Data, and low-memory devices (which also get the "lite" material mode).
 */
export function SmoothScroll() {
  useEffect(() => {
    const nav = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };
    const lowEnd = (nav.deviceMemory ?? 8) <= 4 || nav.connection?.saveData === true;
    if (lowEnd) document.documentElement.dataset.perf = "lite";

    const fine = window.matchMedia("(pointer: fine)").matches;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const isMobile = window.innerWidth < 768 || window.matchMedia("(pointer: coarse)").matches;
    if (!fine || reduce || lowEnd || isMobile) return;

    let raf = 0;
    let destroy: (() => void) | undefined;
    void import("lenis").then(({ default: Lenis }) => {
      const lenis = new Lenis({ lerp: 0.1, wheelMultiplier: 0.9 });
      const loop = (t: number) => {
        lenis.raf(t);
        raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);
      destroy = () => lenis.destroy();
    });
    return () => {
      cancelAnimationFrame(raf);
      destroy?.();
    };
  }, []);
  return null;
}
