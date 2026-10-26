"use client";

import { useRef, type ReactNode } from "react";
import { cx as cn } from "@/lib/cx";

/**
 * Desktop pointer depth: children marked `data-depth` (with a `--d` strength in px) shift with
 * the cursor, giving layered 3D parallax. Only writes two CSS variables per frame; the motion
 * itself is a CSS transition on `translate` (globals.css). Touch and reduced motion: inert.
 */
export function PointerDepth({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const frame = useRef(0);

  function onMove(e: React.PointerEvent<HTMLDivElement>) {
    if (e.pointerType !== "mouse") return;
    const el = ref.current;
    if (!el || frame.current) return;
    const { clientX, clientY } = e;
    frame.current = requestAnimationFrame(() => {
      frame.current = 0;
      const r = el.getBoundingClientRect();
      el.style.setProperty("--mx", (((clientX - r.left) / r.width) * 2 - 1).toFixed(3));
      el.style.setProperty("--my", (((clientY - r.top) / r.height) * 2 - 1).toFixed(3));
    });
  }

  function onLeave() {
    ref.current?.style.setProperty("--mx", "0");
    ref.current?.style.setProperty("--my", "0");
  }

  return (
    <div ref={ref} data-depth-root="" onPointerMove={onMove} onPointerLeave={onLeave} className={cn(className)}>
      {children}
    </div>
  );
}

export { Depth } from "./Depth";
