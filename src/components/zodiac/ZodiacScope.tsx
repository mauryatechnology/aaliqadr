import type { ReactNode } from "react";
import { ZODIAC, type ZodiacSlug } from "@/config/zodiac";
import { cn } from "@/lib/cn";

/**
 * Applies a sign's theme on the server: CSS variables resolve at first paint, so there is no
 * flash of the default theme and no client JavaScript (docs/09 §2).
 *
 * `page`: themes the whole document via `:root:has(.zodiac-page…)` (header, celestial backdrop,
 * body) and stays transparent so the backdrop's parallax layers show through. Without it, the
 * scope is a self-contained themed section with its own background.
 */
export function ZodiacScope({ sign, children, className, page = false }: { sign: ZodiacSlug; children: ReactNode; className?: string; page?: boolean }) {
  return (
    <div data-zodiac={sign} data-element={ZODIAC[sign].element} className={cn(page ? "zodiac-page" : "zodiac-scope", "relative isolate", className)}>
      {children}
    </div>
  );
}
