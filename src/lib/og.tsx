import { ImageResponse } from "next/og";
import { mark } from "@/components/brand/logo-paths";
import { site } from "@/config/site";
import type { ZodiacTheme } from "@/config/zodiac";

export const OG_SIZE = { width: 1200, height: 630 };

const BRAND: Pick<ZodiacTheme, "bg" | "text" | "accent" | "gradient"> = {
  bg: "#0B0A0F",
  text: "#F5F0E6",
  accent: "#C4A044",
  gradient: ["#0B0A0F", "#2A2318", "#6B5524"],
};

/** Themed share card: sign gradient, gold monogram, title. Rendered once per URL and cached. */
export function ogImage({ eyebrow, title, subtitle, theme = BRAND }: { eyebrow: string; title: string; subtitle?: string; theme?: Pick<ZodiacTheme, "bg" | "text" | "accent" | "gradient"> }) {
  const [g1, g2, g3] = theme.gradient;
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          padding: "70px 90px",
          gap: 70,
          color: theme.text,
          background: `radial-gradient(90% 120% at 85% 20%, ${g3} 0%, ${g2} 35%, ${g1} 70%, ${theme.bg} 100%)`,
        }}
      >
        <svg viewBox={mark.viewBox} width={250} height={380} fill="#C4A044">
          {mark.paths.map((d, i) => (
            <path key={i} d={d} />
          ))}
        </svg>
        <div style={{ display: "flex", flexDirection: "column", gap: 18, flex: 1 }}>
          <div style={{ fontSize: 24, letterSpacing: 8, textTransform: "uppercase", color: theme.accent }}>{eyebrow}</div>
          <div style={{ fontSize: 84, lineHeight: 1, fontWeight: 600 }}>{title}</div>
          {subtitle ? <div style={{ fontSize: 30, opacity: 0.85, lineHeight: 1.3 }}>{subtitle}</div> : null}
          <div style={{ marginTop: 20, fontSize: 26, letterSpacing: 10, color: "#C4A044" }}>{site.name.toUpperCase()}</div>
        </div>
      </div>
    ),
    OG_SIZE,
  );
}
