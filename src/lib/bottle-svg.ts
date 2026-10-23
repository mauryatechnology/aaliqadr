import { mark, wordmark } from "@/components/brand/logo-paths";
import type { ZodiacSign, ZodiacTheme } from "@/config/zodiac";

/**
 * Builds the themed perfume bottle as a standalone SVG document (docs/02 §8). Generated once
 * per sign at build time (scripts/generate-bottles.ts → public/bottles/*.svg) and loaded as an
 * image, so a grid of bottles costs one cached request each instead of inline markup.
 *
 * Standalone SVG images can't use page fonts or CSS variables, so colours are literal hex and
 * the brand name on the label is the vector wordmark rather than text.
 */

type BottleTheme = Pick<ZodiacTheme, "primary" | "secondary" | "accent" | "glow" | "gradient">;

export const BRAND_BOTTLE_THEME: BottleTheme = {
  primary: "#C4A044",
  secondary: "#8A8494",
  accent: "#C4A044",
  glow: "#C4A044",
  gradient: ["#0B0A0F", "#2A2318", "#C4A044"],
};

const BODY = "M44 150 Q44 116 78 116 H162 Q196 116 196 150 V318 Q196 352 162 352 H78 Q44 352 44 318 Z";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");

function nested(src: { viewBox: string; paths: readonly string[] }, x: number, y: number, w: number, h: number, fill: string, opacity = 1) {
  const paths = src.paths.map((d) => `<path d="${d}"/>`).join("");
  return `<svg x="${x}" y="${y}" width="${w}" height="${h}" viewBox="${src.viewBox}"><g fill="${fill}" opacity="${opacity}">${paths}</g></svg>`;
}

export function bottleSvg(theme: BottleTheme, sign?: Pick<ZodiacSign, "name">): string {
  const [g1, g2, g3] = theme.gradient;
  const knurl = Array.from({ length: 15 }, (_, i) => `M${92 + i * 4} 30V86`).join("");
  // No zodiac glyph here: inside an <img> there is no reliable way to stop emoji rendering.
  const title = sign ? sign.name.toUpperCase() : "EXTRAIT DE PARFUM";
  const subtitle = sign ? "EXTRAIT DE PARFUM" : "";

  const bottle = `
<g id="bottle">
  <rect x="88" y="20" width="64" height="74" rx="7" fill="url(#metal)"/>
  <rect x="88" y="20" width="64" height="5" rx="2.5" fill="#FBEFC6" opacity=".55"/>
  <path d="${knurl}" stroke="#4A3612" stroke-opacity=".22" stroke-width=".8"/>
  ${nested(mark, 107.4, 39.4, 24, 36, "#FBEFC6", 0.55)}
  ${nested(mark, 108, 40, 24, 36, "#5E461A", 0.85)}
  <rect x="100" y="94" width="40" height="24" rx="2" fill="url(#metal)" opacity=".85"/>
  <rect x="100" y="94" width="40" height="3" fill="#000" opacity=".35"/>
  <path d="${BODY}" fill="url(#glass)"/>
  <g clip-path="url(#clip)">
    <path d="M52 146 Q120 140 188 146 V352 H52 Z" fill="url(#liquid)"/>
    <path d="M52 146 Q120 140 188 146" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="1.2"/>
    <rect x="44" y="322" width="152" height="30" fill="#000" opacity=".28"/>
    <path d="M50 324 H190" stroke="#fff" stroke-opacity=".22"/>
    <path d="M44 250 L196 196 V214 L44 268 Z" fill="#fff" opacity=".05"/>
    <rect x="56" y="128" width="14" height="200" rx="7" fill="url(#streak)"/>
    <rect x="183" y="140" width="3" height="170" rx="1.5" fill="#fff" opacity=".22"/>
    <ellipse cx="72" cy="128" rx="10" ry="3.5" fill="#fff" opacity=".45"/>
  </g>
  <path d="${BODY}" fill="none" stroke="url(#rim)" stroke-width="1.4"/>
  <rect x="76" y="190" width="88" height="112" rx="3" fill="#0B0A0F" fill-opacity=".62" stroke="#C4A044" stroke-opacity=".9"/>
  <rect x="80" y="194" width="80" height="104" rx="2" fill="none" stroke="#C4A044" stroke-opacity=".45" stroke-width=".6"/>
  ${nested(mark, 104, 202, 32, 46, "#E8CF8A")}
  ${nested(wordmark, 93, 255, 54, 10.2, "#E8CF8A")}
  <path d="M104 271H136" stroke="#C4A044" stroke-opacity=".6" stroke-width=".5"/>
  <text x="120" y="283" text-anchor="middle" font-size="7" letter-spacing="1.6" fill="#F5F0E6" fill-opacity=".85" font-family="Cinzel, Georgia, 'Times New Roman', serif">${esc(title)}</text>
  ${subtitle ? `<text x="120" y="293" text-anchor="middle" font-size="5" letter-spacing="1.4" fill="#F5F0E6" fill-opacity=".55" font-family="Cinzel, Georgia, 'Times New Roman', serif">${subtitle}</text>` : ""}
</g>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 240 430" width="240" height="430">
<defs>
  <linearGradient id="glass" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stop-color="${g3}" stop-opacity=".92"/><stop offset=".55" stop-color="${g2}" stop-opacity=".9"/><stop offset="1" stop-color="${g1}"/></linearGradient>
  <linearGradient id="liquid" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="${theme.secondary}" stop-opacity=".55"/><stop offset=".35" stop-color="${theme.primary}" stop-opacity=".55"/><stop offset="1" stop-color="${g1}" stop-opacity=".85"/></linearGradient>
  <linearGradient id="metal" x1="0" x2="1"><stop offset="0" stop-color="#6E5320"/><stop offset=".18" stop-color="#B8923F"/><stop offset=".38" stop-color="#F3DFA0"/><stop offset=".52" stop-color="#D2AE5A"/><stop offset=".75" stop-color="#9C7A2E"/><stop offset="1" stop-color="#5E461A"/></linearGradient>
  <linearGradient id="rim" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#F3DFA0" stop-opacity=".9"/><stop offset=".5" stop-color="${theme.accent}" stop-opacity=".35"/><stop offset="1" stop-color="${theme.accent}" stop-opacity=".7"/></linearGradient>
  <linearGradient id="streak" x1="0" x2="1"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".45" stop-color="#fff" stop-opacity=".55"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
  <linearGradient id="fade" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".5"/><stop offset=".6" stop-color="#fff" stop-opacity="0"/></linearGradient>
  <radialGradient id="glow"><stop offset="0" stop-color="${theme.glow}" stop-opacity=".6"/><stop offset="1" stop-color="${theme.glow}" stop-opacity="0"/></radialGradient>
  <clipPath id="clip"><path d="${BODY}"/></clipPath>
  <mask id="reflect" maskUnits="userSpaceOnUse" x="0" y="352" width="240" height="78"><rect x="0" y="352" width="240" height="78" fill="url(#fade)"/></mask>
</defs>
<ellipse cx="120" cy="352" rx="118" ry="30" fill="url(#glow)"/>
<ellipse cx="120" cy="355" rx="78" ry="5" fill="#000" opacity=".55"/>
${bottle}
<use href="#bottle" xlink:href="#bottle" transform="matrix(1 0 0 -1 0 704)" mask="url(#reflect)" opacity=".35"/>
</svg>
`;
}
