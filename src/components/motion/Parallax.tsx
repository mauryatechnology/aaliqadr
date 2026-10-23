import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * Scroll parallax with zero JavaScript in modern browsers: a CSS scroll-driven animation on
 * the `translate` property (globals.css `[data-parallax]`) that runs on the compositor.
 * `ParallaxRuntime` covers browsers without `animation-timeline`.
 *
 * speed: how far the layer drifts relative to scroll. Negative lags behind (background feel),
 * positive moves ahead (foreground feel). Typical range -0.6…0.6.
 *
 * The wrapper owns the `translate` property, so never put Tailwind translate utilities on it.
 * Ancestors must use `overflow-clip`, never `overflow-hidden`: hidden makes a scroll container,
 * and the view() timeline would then track that (never-scrolling) box instead of the page.
 */
export function Parallax({ speed = -0.25, children, className, as: Tag = "div" }: { speed?: number; children: ReactNode; className?: string; as?: "div" | "span" }) {
  return (
    <Tag data-parallax="" className={cn("block", className)} style={{ "--px-speed": speed } as CSSProperties}>
      {children}
    </Tag>
  );
}
