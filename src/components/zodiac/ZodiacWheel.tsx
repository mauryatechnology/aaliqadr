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
    <nav
      aria-label="The twelve signs"
      className="zodiac-wheel group/wheel relative mx-auto aspect-square w-full max-w-[min(88vw,560px)]"
    >
      {/* Embedded styles for bulletproof 12-sign orbital rotation and hover-pause */}
      <style>{`
        @keyframes orbit-cw {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
        @keyframes orbit-ccw {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(-360deg);
          }
        }
        .orbit-track {
          animation: orbit-cw 28s linear infinite !important;
          transform-origin: 50% 50% !important;
          will-change: transform;
        }
        .orbit-item {
          animation: orbit-ccw 28s linear infinite !important;
          transform-origin: 50% 50% !important;
          will-change: transform;
        }
        .zodiac-wheel:hover .orbit-track,
        .zodiac-wheel:hover .orbit-item,
        .zodiac-wheel:hover .animate-spin-slow,
        .orbit-track:hover,
        .orbit-item:hover {
          animation-play-state: paused !important;
        }
      `}</style>

      {/* Radiant celestial light glow behind the entire wheel */}
      <div
        aria-hidden
        className="animate-celestial-glow pointer-events-none absolute -inset-[20%] -z-10 rounded-full opacity-60"
        style={{
          background:
            "radial-gradient(circle, rgba(196,160,68,0.28) 0%, rgba(212,175,55,0.12) 40%, transparent 70%)",
          filter: "blur(40px)",
        }}
      />

      {/* Outer decorative astronomical tick ring */}
      <div
        aria-hidden
        className="animate-spin-slow absolute inset-[6%] rounded-full border border-gold/25 [mask-image:linear-gradient(black,transparent_120%)]"
      >
        {Array.from({ length: 72 }, (_, i) => (
          <span key={i} className="absolute left-1/2 top-0 h-full w-px origin-center" style={{ transform: `rotate(${i * 5}deg)` }}>
            <span className={`block w-px bg-gold/40 ${i % 6 === 0 ? "h-3" : "h-1.5"}`} />
          </span>
        ))}
      </div>

      <div aria-hidden className="absolute inset-[22%] rounded-full border border-gold/20" />

      {/* Center glowing golden halo with Aaliqadr monogram */}
      <div
        className="absolute inset-[34%] grid place-items-center rounded-full"
        style={{
          background: "radial-gradient(circle, rgb(196 160 68 / .25), rgb(196 160 68 / .06) 50%, transparent 75%)",
          boxShadow: "0 0 50px 10px rgba(196, 160, 68, 0.18)",
        }}
      >
        <Logo variant="mark" className="h-[70%] w-auto animate-float drop-shadow-[0_0_35px_rgba(196,160,68,.45)]" title="Aaliqadr" />
      </div>

      {/* Orbiting track: continuously rotates clockwise around the center; pauses on hover */}
      <div className="orbit-track absolute inset-0">
        <ul className="absolute inset-0">
          {SIGNS.map((s, i) => {
            const angle = (i / 12) * Math.PI * 2 - Math.PI / 2;
            const r = 41; // % radius of the wheel
            const x = 50 + r * Math.cos(angle);
            const y = 50 + r * Math.sin(angle);
            return (
              <li
                key={s.slug}
                className="absolute -translate-x-1/2 -translate-y-1/2"
                style={{ left: `${x}%`, top: `${y}%` }}
                data-zodiac={s.slug}
                data-element={s.element}
              >
                {/* Counter-rotation keeps each zodiac glyph & name perfectly upright at all angles */}
                <div className="orbit-item">
                  <Link
                    href={routes.sign(s.slug)}
                    className="group flex flex-col items-center gap-1 rounded-full p-2 text-center outline-offset-4"
                    aria-label={`${s.name} (${s.rashi}): ${s.fragrance.name}`}
                  >
                    <span
                      className="grid size-11 place-items-center rounded-full border text-xl transition-all duration-500 ease-lux group-hover:scale-125 group-hover:shadow-[0_0_24px_var(--z-glow)] group-focus-visible:scale-125 sm:size-14 sm:text-2xl"
                      style={{
                        color: "var(--z-primary)",
                        borderColor: "color-mix(in oklab, var(--z-primary) 50%, transparent)",
                        background: "color-mix(in oklab, var(--z-bg) 80%, transparent)",
                        boxShadow: "0 0 14px -2px var(--z-glow)",
                      }}
                    >
                      <span aria-hidden>
                        {s.glyph}
                        {"︎"}
                      </span>
                    </span>
                    <span className="font-caps text-[0.55rem] uppercase tracking-[0.2em] text-ivory/80 transition-colors group-hover:text-[var(--z-primary)] sm:text-[0.62rem]">
                      {s.name}
                    </span>
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
