import Image from "next/image";
import { ZODIAC, type ZodiacSlug } from "@/config/zodiac";
import { cn } from "@/lib/cn";

/**
 * Themed perfume bottle, used until product photography exists (docs/02 §8). The artwork is
 * a vector SVG generated per sign at build time (src/lib/bottle-svg.ts → public/bottles/), so
 * it is razor-sharp at any DPI, cached once by the browser and shared by every page.
 * Pass `preload` for an above-the-fold bottle so it loads eagerly (it is often the LCP).
 */
export function BottleArt({ sign, className, preload = false }: { sign?: ZodiacSlug; className?: string; preload?: boolean }) {
  const s = sign ? ZODIAC[sign] : undefined;
  return (
    <Image
      src={`/bottles/${sign ?? "brand"}.svg`}
      alt={s ? `${s.fragrance.name}, the ${s.name} perfume bottle` : "Aaliqadr perfume bottle"}
      width={240}
      height={430}
      unoptimized
      preload={preload}
      loading={preload ? "eager" : "lazy"}
      className={cn("h-auto w-full select-none", className)}
      draggable={false}
    />
  );
}
