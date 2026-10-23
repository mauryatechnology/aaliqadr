import { ZODIAC, type ZodiacSlug } from "@/config/zodiac";
import { cn } from "@/lib/cn";

/** Zodiac glyph forced to text presentation (U+FE0E) so iOS doesn't render an emoji. */
export function Glyph({ sign, className, label = true }: { sign: ZodiacSlug; className?: string; label?: boolean }) {
  const s = ZODIAC[sign];
  return (
    <span className={cn("inline-block leading-none", className)} role={label ? "img" : undefined} aria-label={label ? s.name : undefined} aria-hidden={label ? undefined : true}>
      {s.glyph}
      {"︎"}
    </span>
  );
}
