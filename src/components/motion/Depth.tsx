import type { CSSProperties, ReactNode } from "react";

/**
 * A layer inside PointerDepth. `strength` is the max shift in px (negative = opposite way).
 * Pure server component so it adds zero JS to client bundles.
 */
export function Depth({ strength, children, className }: { strength: number; children: ReactNode; className?: string }) {
  return (
    <div data-depth="" className={className} style={{ "--d": `${strength}px` } as CSSProperties}>
      {children}
    </div>
  );
}
