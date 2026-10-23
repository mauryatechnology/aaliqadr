import Link from "next/link";
import { SIGNS } from "@/config/zodiac";
import { Logo } from "@/components/brand/Logo";
import { routes } from "@/lib/routes";

/**
 * Home navigation hero (docs/09 §4.3). Twelve themed links on a circle around the monogram.
 * Server-rendered and keyboard-reachable; the slow ring rotation is decorative CSS.
 */
export function ZodiacWheel() {
  return (
    <nav aria-label="The twelve signs" className="relative mx-auto aspect-square w-full max-w-[min(88vw,560px)]">
      <div aria-hidden className="absolute inset-[6%] animate-spin-slow rounded-full border border-gold/25 [mask-image:linear-gradient(black,transparent_120%)]">
        {Array.from({ length: 72 }, (_, i) => (
          <span key={i} className="absolute left-1/2 top-0 h-full w-px origin-center" style={{ transform: `rotate(${i * 5}deg)` }}>
            <span className={`block w-px bg-gold/40 ${i % 6 === 0 ? "h-3" : "h-1.5"}`} />
          </span>
        ))}
      </div>
      <div aria-hidden className="absolute inset-[22%] rounded-full border border-gold/15" />
      <div className="absolute inset-[34%] grid place-items-center rounded-full" style={{ background: "radial-gradient(circle, rgb(196 160 68 / .16), transparent 70%)" }}>
        <Logo variant="mark" className="h-[70%] w-auto animate-float drop-shadow-[0_0_30px_rgba(196,160,68,.35)]" title="Aaliqadr" />
      </div>
      <ul className="absolute inset-0">
        {SIGNS.map((s, i) => {
          const angle = (i / 12) * Math.PI * 2 - Math.PI / 2;
          const r = 41; // % of the box
          const x = 50 + r * Math.cos(angle);
          const y = 50 + r * Math.sin(angle);
          return (
            <li key={s.slug} className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: `${x}%`, top: `${y}%` }} data-zodiac={s.slug} data-element={s.element}>
              <Link
                href={routes.sign(s.slug)}
                className="group flex flex-col items-center gap-1 rounded-full p-2 text-center outline-offset-4"
                aria-label={`${s.name} (${s.rashi}): ${s.fragrance.name}`}
              >
                <span
                  className="grid size-11 place-items-center rounded-full border text-xl transition-all duration-500 ease-lux group-hover:scale-125 group-focus-visible:scale-125 sm:size-14 sm:text-2xl"
                  style={{
                    color: "var(--z-primary)",
                    borderColor: "color-mix(in oklab, var(--z-primary) 45%, transparent)",
                    background: "color-mix(in oklab, var(--z-bg) 70%, transparent)",
                    boxShadow: "0 0 0 0 var(--z-glow)",
                  }}
                >
                  <span aria-hidden>
                    {s.glyph}
                    {"︎"}
                  </span>
                </span>
                <span className="font-caps text-[0.55rem] uppercase tracking-[0.2em] text-ivory/70 transition-colors group-hover:text-[var(--z-primary)] sm:text-[0.62rem]">
                  {s.name}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
