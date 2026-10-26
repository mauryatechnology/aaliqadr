"use client";

import { useEffect, useRef, useState, useSyncExternalStore, useTransition } from "react";
import { History, Loader2, X } from "lucide-react";
import { getProductRevisionAction, listProductRevisionsAction } from "@/actions/admin/products";
import type { ProductInput } from "@/schemas/product";
import type { EditorValue } from "@/server/admin/product-form";
import { btnSecondary } from "../ui";

/** Drafts, history and crash recovery for the product editor (plan.md §8.5). */

const when = (iso: string) => new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

/**
 * A saved input (draft or past version) as editor state. Stock is live data, so it always comes
 * from the current editor; a variant that no longer exists comes back as a new one.
 */
export function fromSaved(input: ProductInput, current: EditorValue): EditorValue {
  return {
    ...input,
    variants: input.variants.map((row) => {
      const cur = current.variants.find((c) => c.sku === row.sku && c.existing);
      return cur ? { ...row, initialStock: 0, existing: true, stock: cur.stock, reserved: cur.reserved } : { ...row, initialStock: row.initialStock ?? 0, existing: false, stock: 0, reserved: 0 };
    }),
  };
}

// ── Local autosave ───────────────────────────────────────────────────────────

const AUTOSAVE_MS = 10_000;
const noop = () => () => {};
/** What storage held when the editor opened; later autosaves must not count as "left over". */
const firstRead = new Map<string, string | null>();

function readStore(key: string): string | null {
  if (!firstRead.has(key)) {
    let v: string | null = null;
    try {
      v = window.localStorage.getItem(key);
    } catch {
      // Blocked storage: nothing to restore.
    }
    firstRead.set(key, v);
  }
  return firstRead.get(key) ?? null;
}

/**
 * Keeps unsaved edits in this browser every 10 s, so a crash or closed tab loses little.
 * `pending` is a copy left from an earlier visit that differs from what's saved.
 */
export function useLocalAutosave(key: string, value: EditorValue, saved: string) {
  const stored = useSyncExternalStore(noop, () => readStore(key), () => null);
  const [handled, setHandled] = useState(false);
  const latest = useRef({ value, saved });
  useEffect(() => {
    latest.current = { value, saved };
  });

  useEffect(() => {
    const t = window.setInterval(() => {
      const json = JSON.stringify(latest.current.value);
      try {
        if (json === latest.current.saved) window.localStorage.removeItem(key);
        else window.localStorage.setItem(key, JSON.stringify({ at: new Date().toISOString(), value: latest.current.value }));
      } catch {
        // Storage full or blocked: autosave is a convenience only.
      }
    }, AUTOSAVE_MS);
    return () => {
      window.clearInterval(t);
      firstRead.delete(key);
    };
  }, [key]);

  let pending: { at: string; value: EditorValue } | null = null;
  if (!handled && stored) {
    try {
      const parsed = JSON.parse(stored) as { at: string; value: EditorValue };
      if (JSON.stringify(parsed.value) !== saved) pending = parsed;
    } catch {
      pending = null;
    }
  }

  function clear() {
    setHandled(true);
    try {
      window.localStorage.removeItem(key);
    } catch {
      // ignore
    }
  }
  return { pending, dismiss: clear, clear };
}

// ── Banners ──────────────────────────────────────────────────────────────────

export function VersionBanner({ children, onLoad, loadLabel, onDiscard, discardLabel }: { children: React.ReactNode; onLoad: () => void; loadLabel: string; onDiscard: () => void; discardLabel: string }) {
  return (
    <div role="status" className="flex flex-wrap items-center gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950">
      <p className="min-w-0 flex-1">{children}</p>
      <button type="button" onClick={onLoad} className="rounded-md bg-amber-900 px-3 py-1.5 font-medium text-white hover:bg-amber-950">{loadLabel}</button>
      <button type="button" onClick={onDiscard} className="rounded-md px-3 py-1.5 font-medium hover:bg-amber-100">{discardLabel}</button>
    </div>
  );
}

export const draftNote = (by: string, at: string) => `${by || "Someone"} kept an unpublished draft on ${when(at)}.`;
export const autosaveNote = (at: string) => `Unsaved changes from ${when(at)} were kept in this browser.`;

// ── History ──────────────────────────────────────────────────────────────────

type Revision = Awaited<ReturnType<typeof listProductRevisionsAction>>[number];

export function HistoryButton({ id, onLoad }: { id: string; onLoad: (input: ProductInput, label: string) => void }) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<Revision[] | null>(null);
  const [error, setError] = useState("");
  const [busy, start] = useTransition();

  function toggle() {
    setOpen((o) => !o);
    if (!open)
      start(async () => {
        try {
          setRows(await listProductRevisionsAction(id));
          setError("");
        } catch {
          setError("Couldn't load the history.");
        }
      });
  }

  function load(r: Revision) {
    start(async () => {
      const input = await getProductRevisionAction(id, r.id).catch(() => null);
      if (!input) return setError("That version can't be loaded any more.");
      onLoad(input, when(r.at));
      setOpen(false);
    });
  }

  return (
    <div className="relative">
      <button type="button" className={btnSecondary} onClick={toggle} aria-expanded={open}>
        <History className="size-4" /> History
      </button>
      {open && (
        <div className="absolute left-0 top-12 z-30 w-80 max-w-[calc(100vw-2rem)] rounded-lg border border-neutral-200 bg-white p-2 shadow-lg">
          <div className="flex items-center justify-between px-2 py-1">
            <p className="text-sm font-medium">Saved versions</p>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close history" className="rounded p-1 hover:bg-neutral-100"><X className="size-4" /></button>
          </div>
          {busy && !rows && <p className="flex items-center gap-2 px-2 py-3 text-sm text-neutral-500"><Loader2 className="size-4 animate-spin" /> Loading…</p>}
          {error && <p className="px-2 py-2 text-sm text-red-700">{error}</p>}
          {rows && rows.length === 0 && <p className="px-2 py-3 text-sm text-neutral-500">No saved versions yet. Each save adds one.</p>}
          {rows && rows.length > 0 && (
            <ul className="max-h-80 overflow-y-auto">
              {rows.map((r, i) => (
                <li key={r.id} className="flex items-center gap-2 rounded-md px-2 py-2 hover:bg-neutral-50">
                  <div className="min-w-0 flex-1 text-sm">
                    <p>{when(r.at)}{i === 0 && <span className="ml-1 text-neutral-500">(current)</span>}</p>
                    <p className="truncate text-xs text-neutral-500">{r.by} · {r.status}</p>
                  </div>
                  {i > 0 && (
                    <button type="button" disabled={busy} onClick={() => load(r)} className="rounded-md border border-neutral-300 px-2 py-1 text-xs font-medium hover:bg-neutral-100 disabled:opacity-50">Load</button>
                  )}
                </li>
              ))}
            </ul>
          )}
          <p className="px-2 pt-2 text-xs text-neutral-500">Loading a version puts it in the editor. Nothing changes in the store until you save.</p>
        </div>
      )}
    </div>
  );
}
