"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

/** Small client pieces (plan.md §2.5). */

const abs = new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" });
const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

export function relative(date: Date, now = Date.now()): string {
  const s = Math.round((date.getTime() - now) / 1000);
  const a = Math.abs(s);
  if (a < 45) return "just now";
  if (a < 3600) return rtf.format(Math.round(s / 60), "minute");
  if (a < 86400) return rtf.format(Math.round(s / 3600), "hour");
  if (a < 86400 * 30) return rtf.format(Math.round(s / 86400), "day");
  return abs.format(date);
}

/** "2 hours ago", with the exact India time on hover. */
export function RelativeTime({ date }: { date: Date | string }) {
  const d = typeof date === "string" ? new Date(date) : date;
  return (
    <time dateTime={d.toISOString()} title={abs.format(d)} suppressHydrationWarning>
      {relative(d)}
    </time>
  );
}

export function CopyButton({ value, label = "Copy" }: { value: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      aria-label={`${label} ${value}`}
      title={label}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setDone(true);
          window.setTimeout(() => setDone(false), 1500);
        } catch {
          // Clipboard blocked: nothing to do.
        }
      }}
      className="inline-flex size-6 items-center justify-center rounded text-neutral-400 hover:bg-neutral-100 hover:text-neutral-800"
    >
      {done ? <Check className="size-3.5 text-emerald-600" /> : <Copy className="size-3.5" />}
    </button>
  );
}

/** Comfortable / Compact rows, remembered in this browser. */
export function DensityToggle() {
  const [dense, setDense] = useState(() => (typeof document === "undefined" ? true : document.documentElement.dataset.density !== "comfortable"));
  function set(next: boolean) {
    setDense(next);
    document.documentElement.dataset.density = next ? "compact" : "comfortable";
    try {
      localStorage.setItem("aq.admin-density", next ? "compact" : "comfortable");
    } catch {
      // ignore
    }
  }
  return (
    <button type="button" onClick={() => set(!dense)} aria-pressed={!dense} className="text-left text-neutral-600 hover:text-neutral-900" suppressHydrationWarning>
      Rows: {dense ? "compact" : "comfortable"}
    </button>
  );
}
