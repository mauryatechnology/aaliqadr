import type { ZodiacSlug } from "@/config/zodiac";
import { ZodiacGoldGlyph } from "@/components/zodiac/ZodiacGoldGlyph";

/**
 * Standardized Astrological Vector Glyph for Aaliqadr Maison de Parfum.
 * Emits authentic champagne gold celestial glyphs consistently across all pages.
 */
export function Glyph({
  sign,
  className,
  label: _label,
}: {
  sign: ZodiacSlug;
  className?: string;
  label?: boolean;
}) {
  return <ZodiacGoldGlyph sign={sign} className={className} />;
}
