import { site } from "@/config/site";
import { OG_SIZE, ogImage } from "@/lib/og";

export const alt = `${site.name}: luxury zodiac perfumes`;
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return ogImage({ eyebrow: "Extrait de Parfum · Twelve signs", title: "A fragrance written in your stars", subtitle: "One signature for every rashi." });
}
