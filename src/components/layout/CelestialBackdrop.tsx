import { SIGNS } from "@/config/zodiac";

/**
 * Site-wide night sky behind every page (docs/09 §3). Fixed layers that drift at different
 * speeds as the page scrolls (CSS scroll timeline on the root, `ParallaxRuntime` fallback),
 * tinted by the active sign through the --z-* tokens. Pure server markup, no JavaScript.
 */

// Deterministic pseudo-random so markup is identical on every render (cacheable, no hydration).
const rand = (i: number, salt: number) => {
  const x = Math.sin(i * 12.9898 + salt * 78.233) * 43758.5453;
  return x - Math.floor(x);
};

/**
 * A star tile repeated across the layer with an SVG <pattern>: a few dozen circles of markup
 * cover any screen size. A handful of separate stars twinkle on top.
 */
function Stars({ id, tile, count, salt, maxR, twinkles }: { id: string; tile: number; count: number; salt: number; maxR: number; twinkles: number }) {
  return (
    <svg className="h-full w-full" aria-hidden>
      <defs>
        <pattern id={id} width={tile} height={tile} patternUnits="userSpaceOnUse">
          {Array.from({ length: count }, (_, i) => (
            <circle
              key={i}
              cx={(rand(i, salt + 2) * tile).toFixed(1)}
              cy={(rand(i, salt + 3) * tile).toFixed(1)}
              r={(0.4 + rand(i, salt + 1) * maxR).toFixed(2)}
              fill={i % 7 === 0 ? "var(--z-accent)" : i % 5 === 0 ? "var(--z-glow)" : "#F5F0E6"}
              opacity={(0.18 + rand(i, salt + 4) * 0.42).toFixed(2)}
            />
          ))}
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
      {Array.from({ length: twinkles }, (_, i) => (
        <circle
          key={i}
          cx={`${(rand(i, salt + 7) * 100).toFixed(1)}%`}
          cy={`${(rand(i, salt + 8) * 100).toFixed(1)}%`}
          r={(0.8 + rand(i, salt + 9) * maxR).toFixed(2)}
          fill={i % 3 === 0 ? "var(--z-glow)" : "#F5F0E6"}
          className="twinkle"
          style={{ animationDelay: `${(-rand(i, salt + 5) * 6).toFixed(2)}s` }}
        />
      ))}
    </svg>
  );
}

function ZodiacRing() {
  return (
    <svg viewBox="-500 -500 1000 1000" className="h-full w-full" aria-hidden>
      <circle r="470" fill="none" stroke="var(--z-accent)" strokeWidth="1" />
      <circle r="400" fill="none" stroke="var(--z-accent)" strokeWidth=".6" />
      <circle r="250" fill="none" stroke="var(--z-accent)" strokeWidth=".4" strokeDasharray="2 8" />
      {Array.from({ length: 72 }, (_, i) => {
        const a = (i / 72) * Math.PI * 2;
        const inner = i % 6 === 0 ? 400 : 445;
        return (
          <line
            key={i}
            x1={(Math.cos(a) * inner).toFixed(1)}
            y1={(Math.sin(a) * inner).toFixed(1)}
            x2={(Math.cos(a) * 470).toFixed(1)}
            y2={(Math.sin(a) * 470).toFixed(1)}
            stroke="var(--z-accent)"
            strokeWidth={i % 6 === 0 ? 1 : 0.5}
          />
        );
      })}
      {SIGNS.map((s, i) => {
        const a = (i / 12) * Math.PI * 2 - Math.PI / 2 + Math.PI / 12;
        return (
          <text key={s.slug} x={(Math.cos(a) * 435).toFixed(1)} y={(Math.sin(a) * 435 + 9).toFixed(1)} textAnchor="middle" fontSize="26" fill="var(--z-accent)" style={{ fontFamily: "serif" }}>
            {s.glyph}
            {"︎"}
          </text>
        );
      })}
    </svg>
  );
}

export function CelestialBackdrop() {
  return (
    <div aria-hidden className="celestial pointer-events-none fixed inset-0 -z-30 overflow-hidden">
      {/* Sign-tinted nebula + vignette */}
      <div className="absolute inset-0" style={{ background: "radial-gradient(120% 70% at 70% -10%, color-mix(in oklab, var(--z-g2) 32%, transparent), transparent 62%), radial-gradient(90% 60% at 0% 110%, color-mix(in oklab, var(--z-g3) 14%, transparent), transparent 60%)" }} />
      {/* Far stars: slowest */}
      <div data-parallax-root="0.06" className="absolute inset-x-0 top-0 h-[170vh] opacity-80" style={{ "--pr-speed": 0.06 } as React.CSSProperties}>
        <Stars id="stars-far" tile={420} count={30} salt={11} maxR={0.7} twinkles={5} />
      </div>
      {/* Near stars: faster, brighter */}
      <div data-parallax-root="0.16" className="absolute inset-x-0 top-0 h-[190vh]" style={{ "--pr-speed": 0.16 } as React.CSSProperties}>
        <Stars id="stars-near" tile={640} count={12} salt={29} maxR={1.1} twinkles={8} />
      </div>
      {/* Celestial clockwork: turns as you scroll */}
      <div className="zodiac-ring absolute -right-[38vmin] top-[8vh] aspect-square w-[120vmin] opacity-[0.07]">
        <ZodiacRing />
      </div>
      <div className="absolute inset-0" style={{ background: "radial-gradient(130% 100% at 50% 40%, transparent 55%, rgb(0 0 0 / .55) 100%)" }} />
    </div>
  );
}
