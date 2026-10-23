import { cn } from "@/lib/cn";
import { full, mark, wordmark } from "./logo-paths";

type Variant = "full" | "mark" | "wordmark" | "horizontal";

const SOURCES = { full, mark, wordmark };

function Svg({ src, className, title }: { src: (typeof SOURCES)[keyof typeof SOURCES]; className?: string; title?: string }) {
  return (
    <svg viewBox={src.viewBox} fill="currentColor" className={className} role={title ? "img" : undefined} aria-hidden={title ? undefined : true}>
      {title ? <title>{title}</title> : null}
      {src.paths.map((d, i) => (
        <path key={i} d={d} />
      ))}
    </svg>
  );
}

/**
 * Official Aaliqadr logo from the vector master (docs/02 §1.1). Colour comes from `currentColor`,
 * so the logo stays gold or ivory on every sign theme. Never rebuild the wordmark with a font.
 */
export function Logo({ variant = "horizontal", className, title = "Aaliqadr" }: { variant?: Variant; className?: string; title?: string }) {
  if (variant !== "horizontal") {
    return <Svg src={SOURCES[variant]} className={cn("text-gold", className)} title={title} />;
  }
  return (
    <span className={cn("inline-flex items-center gap-3 text-gold", className)} role="img" aria-label={title}>
      <Svg src={mark} className="h-full w-auto" />
      <span aria-hidden className="h-[70%] w-px bg-current opacity-50" />
      <Svg src={wordmark} className="h-[42%] w-auto" />
    </span>
  );
}
