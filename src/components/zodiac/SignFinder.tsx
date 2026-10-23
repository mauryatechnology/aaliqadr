"use client";

import Link from "next/link";
import { useId, useState } from "react";
import { ArrowRight } from "lucide-react";
import { SIGNS, type ZodiacSign } from "@/config/zodiac";
import { formatSignDates, sunSignFor } from "@/lib/zodiac-math";
import { routes } from "@/lib/routes";

/**
 * Western sun sign from a birth date, computed in the browser only (docs/02 §2): the date is
 * never sent anywhere. Vedic followers pick their rashi directly instead.
 */
export function SignFinder() {
  const id = useId();
  const [mode, setMode] = useState<"date" | "vedic">("date");
  const [result, setResult] = useState<ZodiacSign | null>(null);

  function onDate(value: string) {
    const m = /^\d{4}-(\d{2})-(\d{2})$/.exec(value);
    setResult(m ? sunSignFor(Number(m[1]), Number(m[2])) : null);
  }

  return (
    <div className="flex flex-col gap-8">
      <div role="tablist" aria-label="How do you know your sign?" className="mx-auto inline-flex rounded-full border border-white/15 p-1">
        {(
          [
            ["date", "By birth date"],
            ["vedic", "I know my rashi"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            role="tab"
            aria-selected={mode === key}
            onClick={() => setMode(key)}
            className={`rounded-full px-5 py-2 text-xs uppercase tracking-[0.18em] transition-colors ${mode === key ? "bg-gold text-obsidian" : "text-fg/75 hover:text-fg"}`}
          >
            {label}
          </button>
        ))}
      </div>

      {mode === "date" ? (
        <div className="flex flex-col items-center gap-6">
          <label htmlFor={id} className="text-sm text-muted">
            Your date of birth (we never store it)
          </label>
          <input
            id={id}
            type="date"
            min="1920-01-01"
            max="2026-12-31"
            onChange={(e) => onDate(e.target.value)}
            className="surface h-14 w-full max-w-xs px-5 text-center text-lg text-fg [color-scheme:dark]"
          />
          <p className="max-w-md text-center text-xs text-muted">
            This gives your Western sun sign. Many Indian families follow the Vedic moon sign (rashi), which can differ. If you know your rashi,
            choose it directly.
          </p>
          <div aria-live="polite" className="w-full">
            {result && <Result sign={result} />}
          </div>
        </div>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {SIGNS.map((s) => (
            <li key={s.slug} data-zodiac={s.slug} data-element={s.element}>
              <Link href={routes.sign(s.slug)} className="surface flex items-center gap-4 p-4 transition-transform hover:-translate-y-0.5">
                <span className="text-3xl" style={{ color: "var(--z-primary)" }} aria-hidden>
                  {s.glyph}
                  {"︎"}
                </span>
                <span className="flex flex-col">
                  <span className="font-display text-xl" lang="hi-Latn">
                    {s.rashi}
                  </span>
                  <span className="text-xs text-muted">{s.name}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Result({ sign }: { sign: ZodiacSign }) {
  return (
    <div data-zodiac={sign.slug} data-element={sign.element} className="surface mx-auto flex max-w-lg flex-col items-center gap-4 overflow-hidden p-8 text-center">
      <span className="text-6xl" style={{ color: "var(--z-primary)" }} aria-hidden>
        {sign.glyph}
        {"︎"}
      </span>
      <p className="eyebrow">
        {sign.rashi} · {formatSignDates(sign)}
      </p>
      <h2 className="font-display text-4xl">You are {sign.name}</h2>
      <p className="text-muted">
        Your signature is <span className="text-fg">{sign.fragrance.name}</span>: {sign.fragrance.tagline.toLowerCase()}.
      </p>
      <Link
        href={routes.sign(sign.slug)}
        className="inline-flex h-12 items-center gap-2 rounded-full px-7 font-caps text-[0.7rem] uppercase tracking-[0.24em]"
        style={{ background: "var(--z-primary)", color: "var(--z-on-primary)" }}
      >
        Enter {sign.name} <ArrowRight className="size-4" />
      </Link>
    </div>
  );
}
