import type { CSSProperties } from "react";
import { ZODIAC, type ZodiacSlug } from "@/config/zodiac";

/**
 * Per-sign atmosphere (docs/02 §7). Pure CSS on the compositor (transform/opacity only),
 * no JavaScript. Reduced motion stops every animation via globals.css.
 */

// Deterministic pseudo-random so server and client markup match and the output is cacheable.
const rand = (i: number, salt: number) => {
  const x = Math.sin(i * 12.9898 + salt * 78.233) * 43758.5453;
  return x - Math.floor(x);
};

function Particles({ count, kind }: { count: number; kind: "ember" | "star" | "petal" | "bubble" }) {
  return (
    <>
      {Array.from({ length: count }, (_, i) => {
        const size = kind === "petal" ? 6 + rand(i, 3) * 8 : 2 + rand(i, 1) * 4;
        const style: CSSProperties = {
          left: `${rand(i, 2) * 100}%`,
          bottom: `-${10 + rand(i, 4) * 20}px`,
          width: size,
          height: kind === "petal" ? size * 0.6 : size,
          animationDelay: `${-rand(i, 5) * 9}s`,
          animationDuration: `${7 + rand(i, 6) * 8}s`,
          background:
            kind === "bubble"
              ? "radial-gradient(circle at 35% 35%, rgb(255 255 255 / .55), color-mix(in oklab, var(--z-secondary) 40%, transparent) 70%)"
              : kind === "petal"
                ? "color-mix(in oklab, var(--z-secondary) 70%, transparent)"
                : "var(--z-glow)",
          boxShadow: kind === "ember" ? "0 0 10px 2px var(--z-glow)" : kind === "star" ? "0 0 6px 1px var(--z-accent)" : undefined,
          borderRadius: kind === "petal" ? "60% 0 60% 0" : "9999px",
        };
        return <span key={i} className="absolute block animate-rise opacity-0" style={style} />;
      })}
    </>
  );
}

export function AmbientLayer({ sign, intensity = 1 }: { sign?: ZodiacSlug; intensity?: number }) {
  const ambient = sign ? ZODIAC[sign].ambient : "startrails";
  const n = (base: number) => Math.round(base * intensity);
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <div className="aurora" />
      {ambient === "embers" && <Particles count={n(26)} kind="ember" />}
      {ambient === "startrails" && <Particles count={n(30)} kind="star" />}
      {ambient === "petals" && <Particles count={n(14)} kind="petal" />}
      {(ambient === "lagoon" || ambient === "waves") && <Particles count={n(16)} kind="bubble" />}
      {ambient === "sunrays" && (
        <div
          className="absolute left-1/2 top-1/3 aspect-square w-[160vmax] -translate-x-1/2 -translate-y-1/2 animate-spin-slow opacity-15"
          style={{ background: "repeating-conic-gradient(from 0deg, var(--z-glow) 0deg 4deg, transparent 4deg 18deg)", maskImage: "radial-gradient(circle, black, transparent 60%)" }}
        />
      )}
      {ambient === "moon" && (
        <div
          className="absolute right-[8%] top-[10%] aspect-square w-[22vmin] animate-float rounded-full"
          style={{ background: "radial-gradient(circle at 40% 40%, var(--z-accent), var(--z-primary) 60%, transparent 72%)", boxShadow: "0 0 80px 10px color-mix(in oklab, var(--z-glow) 45%, transparent)" }}
        />
      )}
      {ambient === "orbs" && (
        <>
          <div className="absolute left-[18%] top-[22%] aspect-square w-[26vmin] animate-float rounded-full opacity-60 blur-2xl" style={{ background: "var(--z-primary)" }} />
          <div className="absolute right-[16%] top-[38%] aspect-square w-[22vmin] animate-float rounded-full opacity-50 blur-2xl [animation-delay:-3.5s]" style={{ background: "var(--z-secondary)" }} />
        </>
      )}
      {ambient === "smoke" && (
        <div className="absolute inset-0 opacity-50" style={{ background: "radial-gradient(60% 50% at 50% 100%, var(--z-g2), transparent 70%), radial-gradient(120% 80% at 50% 50%, transparent 40%, #000 100%)" }} />
      )}
      {ambient === "mountains" && (
        <svg className="absolute inset-x-0 bottom-0 h-[38%] w-full opacity-40" viewBox="0 0 1200 300" preserveAspectRatio="none">
          <path d="M0 300 L180 120 L300 210 L470 40 L640 220 L780 110 L960 240 L1080 150 L1200 230 L1200 300 Z" fill="var(--z-g2)" />
          <path d="M0 300 L220 200 L420 260 L600 150 L820 270 L1000 190 L1200 280 L1200 300 Z" fill="var(--z-g1)" />
        </svg>
      )}
      {ambient === "botanical" && (
        <svg className="absolute -right-10 top-10 h-[70%] w-auto animate-float opacity-20" viewBox="0 0 200 400" fill="none" stroke="var(--z-accent)" strokeWidth="1.2">
          <path d="M100 400 C100 300 100 200 100 20" />
          {Array.from({ length: 8 }, (_, i) => (
            <path key={i} d={`M100 ${360 - i * 42} C ${i % 2 ? 150 : 50} ${340 - i * 42}, ${i % 2 ? 170 : 30} ${320 - i * 42}, ${i % 2 ? 140 : 60} ${300 - i * 42}`} />
          ))}
        </svg>
      )}
      <div className="absolute inset-0" style={{ background: "radial-gradient(120% 90% at 50% 0%, transparent 40%, var(--z-bg) 100%)" }} />
    </div>
  );
}
