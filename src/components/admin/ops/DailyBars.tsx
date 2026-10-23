"use client";

import { useState } from "react";
import { formatPrice } from "@/lib/money";

/**
 * Daily sales as thin bars (one series, magnitude: a single ink, no legend). Hover or focus a
 * day for its figures; the table below the chart is the accessible view of the same data.
 */
export function DailyBars({ days }: { days: { date: string; grossP: number; orders: number }[] }) {
  const [active, setActive] = useState<number | null>(null);
  const max = Math.max(1, ...days.map((d) => d.grossP));
  const fmt = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short" });
  const shown = active !== null ? days[active] : undefined;
  return (
    <figure className="flex flex-col gap-2">
      <div className="flex h-6 items-center text-sm text-neutral-700" aria-live="polite">
        {shown ? <span><strong className="text-neutral-900">{fmt.format(new Date(shown.date))}</strong> · {formatPrice(shown.grossP)} · {shown.orders} order{shown.orders === 1 ? "" : "s"}</span> : <span className="text-neutral-500">Hover a bar for the day&apos;s figures</span>}
      </div>
      <div className="relative h-48 border-b border-neutral-300" onMouseLeave={() => setActive(null)}>
        <div className="absolute inset-0 flex items-end gap-[2px]">
          {days.map((d, i) => (
            <button
              key={d.date}
              type="button"
              aria-label={`${fmt.format(new Date(d.date))}: ${formatPrice(d.grossP)}, ${d.orders} orders`}
              onMouseEnter={() => setActive(i)}
              onFocus={() => setActive(i)}
              onBlur={() => setActive(null)}
              className="group relative flex h-full flex-1 items-end outline-none"
            >
              <span
                className={`block w-full rounded-t-[4px] transition-colors ${active === i ? "bg-neutral-900" : "bg-neutral-600 group-focus-visible:bg-neutral-900"}`}
                style={{ height: `${Math.max(d.grossP > 0 ? 2 : 0, (d.grossP / max) * 100)}%` }}
              />
            </button>
          ))}
        </div>
      </div>
      <figcaption className="flex justify-between text-xs text-neutral-500">
        <span>{days[0] ? fmt.format(new Date(days[0].date)) : ""}</span>
        <span>Peak {formatPrice(max)}</span>
        <span>{days.at(-1) ? fmt.format(new Date(days.at(-1)!.date)) : ""}</span>
      </figcaption>
    </figure>
  );
}
