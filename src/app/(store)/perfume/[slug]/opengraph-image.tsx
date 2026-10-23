import { ELEMENT_INFO, ZODIAC } from "@/config/zodiac";
import { formatPrice } from "@/lib/money";
import { OG_SIZE, ogImage } from "@/lib/og";
import { getProductBySlug } from "@/server/queries/catalog";

export const alt = "Aaliqadr perfume";
export const size = OG_SIZE;
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = await getProductBySlug(slug);
  if (!p) return ogImage({ eyebrow: "Aaliqadr", title: "Zodiac Perfumes" });
  const themeSign = p.zodiacSign ?? (p.element ? ELEMENT_INFO[p.element].signs[0] : undefined);
  const sign = p.zodiacSign ? ZODIAC[p.zodiacSign] : undefined;
  const from = Math.min(...p.variants.map((v) => v.priceP));
  return ogImage({
    eyebrow: sign ? `${sign.name} · ${sign.rashi} · Extrait de Parfum` : "Aaliqadr",
    title: p.name,
    subtitle: `${p.tagline}. From ${formatPrice(from)}`,
    theme: themeSign ? ZODIAC[themeSign].theme : undefined,
  });
}
