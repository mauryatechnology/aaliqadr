"use client";

import { useSyncExternalStore } from "react";
import { AlertCircle, CheckCircle2, X } from "lucide-react";
import { cx } from "@/lib/cx";

/**
 * Global toasts for the admin (plan.md §2.4). Mounted once in the admin layout, so a message
 * survives `router.refresh()` (bug B11). Call `toast.success()` / `toast.error()` from anywhere.
 */

type Action = { label: string; run: () => void };
type Toast = { id: number; kind: "success" | "error"; message: string; action?: Action };
let toasts: Toast[] = [];
let nextId = 1;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

function push(kind: Toast["kind"], message: string, action?: Action) {
  if (!message) return;
  const id = nextId++;
  toasts = [...toasts.filter((t) => t.message !== message), { id, kind, message, action }].slice(-4);
  emit();
  window.setTimeout(() => dismiss(id), kind === "error" ? 7000 : action ? 8000 : 4000);
}
function dismiss(id: number) {
  toasts = toasts.filter((t) => t.id !== id);
  emit();
}

export const toast = {
  /** With `action`, the toast offers a button (e.g. Undo) for 8 s. */
  success: (m: string, action?: Action) => push("success", m, action),
  error: (m: string) => push("error", m),
  /** Shows an action result: its message on success, its error otherwise. */
  result: (s: { ok?: boolean; message?: string; error?: string }) => (s.error ? push("error", s.error) : s.ok && s.message ? push("success", s.message) : undefined),
};

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
const empty: Toast[] = [];

export function Toaster() {
  const list = useSyncExternalStore(subscribe, () => toasts, () => empty);
  return (
    <div aria-live="polite" className="pointer-events-none fixed right-4 top-4 z-[60] flex w-[min(92vw,380px)] flex-col gap-2">
      {list.map((t) => (
        <div key={t.id} role={t.kind === "error" ? "alert" : "status"} className={cx("pointer-events-auto flex items-start gap-2 rounded-lg border px-3 py-2.5 text-sm shadow-lg", t.kind === "error" ? "border-red-200 bg-red-50 text-red-900" : "border-emerald-200 bg-white text-neutral-900")}>
          {t.kind === "error" ? <AlertCircle className="mt-0.5 size-4 shrink-0 text-red-600" aria-hidden /> : <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" aria-hidden />}
          <p className="flex-1">{t.message}</p>
          {t.action && (
            <button type="button" className="rounded px-1.5 text-sm font-semibold underline underline-offset-2" onClick={() => { dismiss(t.id); t.action!.run(); }}>
              {t.action.label}
            </button>
          )}
          <button type="button" onClick={() => dismiss(t.id)} aria-label="Dismiss" className="rounded p-0.5 opacity-60 hover:opacity-100"><X className="size-3.5" /></button>
        </div>
      ))}
    </div>
  );
}
