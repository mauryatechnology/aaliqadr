import { ZODIAC, isZodiacSlug } from "@/config/zodiac";
import { OG_SIZE, ogImage } from "@/lib/og";

export const alt = "Aaliqadr zodiac perfume";
export const size = OG_SIZE;
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ sign: string }> }) {
  const { sign } = await params;
  if (!isZodiacSlug(sign)) return ogImage({ eyebrow: "Aaliqadr", title: "The Zodiac" });
  const s = ZODIAC[sign];
  return ogImage({ eyebrow: `${s.rashi} · ${s.element} sign`, title: s.name, subtitle: `${s.fragrance.name}: ${s.fragrance.tagline}`, theme: s.theme });
}
