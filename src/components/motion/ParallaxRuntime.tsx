"use client";

import { useEffect } from "react";

/**
 * Fallback for browsers without CSS scroll-driven animations (globals.css does the work
 * everywhere else). One passive scroll listener and one rAF per frame, updating `translate`
 * on the same elements with the same maths:
 *   [data-parallax]       drifts by speed × (distance of its centre from the viewport centre)
 *   [data-parallax-root]  fixed layers that drift by speed × scrollY
 */
export function ParallaxRuntime() {
  useEffect(() => {
    if (CSS.supports("animation-timeline: view()")) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (document.documentElement.dataset.perf === "lite") return;
    // On mobile and touch screens, skip JS parallax to eliminate layout thrashing and keep 60/120fps native scroll.
    if (window.innerWidth < 768 || window.matchMedia("(pointer: coarse)").matches) return;

    let frame = 0;
    const update = () => {
      frame = 0;
      const vh = window.innerHeight;
      for (const el of document.querySelectorAll<HTMLElement>("[data-parallax]")) {
        const r = el.getBoundingClientRect();
        if (r.bottom < -200 || r.top > vh + 200) continue;
        const speed = Number(getComputedStyle(el).getPropertyValue("--px-speed")) || 0;
        // Matches the CSS keyframes: lagging layers (speed < 0) sit higher while below centre.
        const offset = (r.top + r.height / 2 - vh / 2) * speed * 0.4;
        el.style.translate = `0 ${offset.toFixed(1)}px`;
      }
      for (const el of document.querySelectorAll<HTMLElement>("[data-parallax-root]")) {
        const speed = Number(el.dataset.parallaxRoot) || 0;
        el.style.translate = `0 ${(-window.scrollY * speed).toFixed(1)}px`;
      }
      const ring = document.querySelector<HTMLElement>(".zodiac-ring");
      if (ring) {
        ring.style.transform = `rotate(${(window.scrollY * 0.045).toFixed(1)}deg)`;
      }
    };
    const onScroll = () => {
      frame ||= requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);
  return null;
}
