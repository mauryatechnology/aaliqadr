"use client";

import { useEffect, useState, useRef, useSyncExternalStore, type RefObject } from "react";

function subscribeReducedMotion(callback: () => void) {
  if (typeof window === "undefined") return () => {};
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  mq.addEventListener("change", callback);
  return () => mq.removeEventListener("change", callback);
}

function getReducedMotionSnapshot() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function getReducedMotionServerSnapshot() {
  return false;
}

/**
 * Checks for user's system preference for reduced motion.
 */
export function useReducedMotionPreference(): boolean {
  return useSyncExternalStore(subscribeReducedMotion, getReducedMotionSnapshot, getReducedMotionServerSnapshot);
}

/**
 * Mouse parallax hook for desktop pointers.
 * Returns subtle normalized coordinates (-1 to 1) damped for high-end feel.
 */
export function useMouseParallax(
  ref: RefObject<HTMLElement | null>,
  maxOffset = 12,
  damping = 0.08
) {
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const frameRef = useRef(0);
  const targetRef = useRef({ x: 0, y: 0 });
  const currentRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const isDesktop = window.matchMedia("(min-width: 768px) and (pointer: fine)").matches;
    if (!isDesktop) return;

    const onPointerMove = (e: PointerEvent) => {
      const container = ref.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const ny = ((e.clientY - rect.top) / rect.height) * 2 - 1;
      targetRef.current = {
        x: Math.max(-1, Math.min(1, nx)) * maxOffset,
        y: Math.max(-1, Math.min(1, ny)) * maxOffset,
      };
    };

    const loop = () => {
      currentRef.current.x += (targetRef.current.x - currentRef.current.x) * damping;
      currentRef.current.y += (targetRef.current.y - currentRef.current.y) * damping;
      setOffset({
        x: Math.round(currentRef.current.x * 100) / 100,
        y: Math.round(currentRef.current.y * 100) / 100,
      });
      frameRef.current = requestAnimationFrame(loop);
    };

    window.addEventListener("pointermove", onPointerMove, { passive: true });
    frameRef.current = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      cancelAnimationFrame(frameRef.current);
    };
  }, [ref, maxOffset, damping]);

  return offset;
}
