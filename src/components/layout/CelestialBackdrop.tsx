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
          {Array.from({ length: count }, (_, i) => {
            const isGold = i % 5 === 0;
            const isBright = i % 3 === 0;
            return (
              <circle
                key={i}
                cx={(rand(i, salt + 2) * tile).toFixed(1)}
                cy={(rand(i, salt + 3) * tile).toFixed(1)}
                r={(0.5 + rand(i, salt + 1) * maxR).toFixed(2)}
                fill={isGold ? "var(--gold, #C9A96E)" : isBright ? "#FFFFFF" : "#F4EFE6"}
                opacity={(0.28 + rand(i, salt + 4) * 0.52).toFixed(2)}
              />
            );
          })}
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
      {Array.from({ length: twinkles }, (_, i) => (
        <circle
          key={i}
          cx={`${(rand(i, salt + 7) * 100).toFixed(1)}%`}
          cy={`${(rand(i, salt + 8) * 100).toFixed(1)}%`}
          r={(0.9 + rand(i, salt + 9) * maxR).toFixed(2)}
          fill={i % 2 === 0 ? "var(--gold, #C9A96E)" : "#FFFFFF"}
          className="twinkle"
          style={{ animationDelay: `${(-rand(i, salt + 5) * 6).toFixed(2)}s` }}
        />
      ))}
    </svg>
  );
}

export function CelestialBackdrop() {
  return (
    <div aria-hidden className="celestial pointer-events-none fixed inset-0 -z-30 overflow-clip">
      {/* Deep obsidian ambient backdrop */}
      <div
        className="absolute inset-0 bg-[#060508]"
      />
      {/* Subtle cosmic starlight glow in upper center */}
      <div
        className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 h-[50vh] w-[80vw] blur-[160px] opacity-25"
        style={{
          background: "radial-gradient(ellipse at top, rgba(201,169,110,0.12) 0%, transparent 70%)",
        }}
      />
      {/* Far stars: slowest, extended to cover down to footer */}
      <div data-parallax-root="0.05" className="absolute inset-x-0 top-0 h-[450vh] opacity-90" style={{ "--pr-speed": 0.05 } as React.CSSProperties}>
        <Stars id="stars-far" tile={380} count={38} salt={11} maxR={0.9} twinkles={14} />
      </div>
      {/* Near stars: faster, brighter, extended to cover down to footer */}
      <div data-parallax-root="0.14" className="absolute inset-x-0 top-0 h-[480vh]" style={{ "--pr-speed": 0.14 } as React.CSSProperties}>
        <Stars id="stars-near" tile={540} count={22} salt={29} maxR={1.4} twinkles={18} />
      </div>
      <div className="absolute inset-0" style={{ background: "radial-gradient(150% 120% at 50% 50%, transparent 85%, rgba(0, 0, 0, 0.12) 100%)" }} />
    </div>
  );
}
