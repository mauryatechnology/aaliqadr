"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { Route } from "next";
import { useEffect, useRef, useState, useTransition } from "react";
import { Bookmark, ChevronDown, Download, Loader2, Search, Trash2, X } from "lucide-react";
import { deleteViewAction, listViewsAction, saveViewAction } from "@/actions/admin/views";
import { exportListCsvAction } from "@/actions/admin/lists";
import type { ListKind } from "@/server/admin/list-kinds";
import { cx } from "@/lib/cx";
import { toast } from "./Toaster";

/**
 * One toolbar for every admin list (plan.md §2.3): debounced search, filters, a mobile sort
 * select, export, and removable chips for what's applied. Everything goes into the URL.
 */

export type FilterDef = { key: string; label: string; type?: "select" | "multi" | "date"; options?: { value: string; label: string }[] };

const field = "h-9 rounded-lg border border-neutral-300 bg-white px-2.5 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none";

export function ListToolbar({
  placeholder = "Search",
  filters = [],
  sorts,
  exportKind,
  sortAlways = false,
  children,
}: {
  placeholder?: string;
  filters?: FilterDef[];
  /** Shown as a select on small screens (the table headers sort on desktop). */
  sorts?: { value: string; label: string }[];
  exportKind?: ListKind;
  /** Show the sort select on every screen size (lists whose headers don't sort). */
  sortAlways?: boolean;
  children?: React.ReactNode;
}) {
  const router = useRouter();
  const path = usePathname();
  const sp = useSearchParams();
  const [q, setQ] = useState(sp.get("q") ?? "");
  const [navigating, start] = useTransition();
  const [exporting, startExport] = useTransition();
  const timer = useRef<number>(undefined);
  // What this box last sent to the URL: a URL change to anything else came from outside.
  const [lastPushed, setLastPushed] = useState(sp.get("q") ?? "");

  function go(patch: Record<string, string | null>) {
    const next = new URLSearchParams(sp.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    next.delete("page");
    const s = next.toString();
    start(() => router.replace(`${path}${s ? `?${s}` : ""}` as Route, { scroll: false }));
  }

  // Keep the box in sync when the URL changes from elsewhere (chips, Back).
  const urlQ = sp.get("q") ?? "";
  const [prevUrlQ, setPrevUrlQ] = useState(urlQ);
  if (urlQ !== prevUrlQ) {
    setPrevUrlQ(urlQ);
    if (urlQ !== lastPushed) setQ(urlQ);
  }

  useEffect(() => () => window.clearTimeout(timer.current), []);
  function onSearch(value: string) {
    setQ(value);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      setLastPushed(value.trim());
      go({ q: value.trim() || null });
    }, 300);
  }

  const values = (k: string) => (sp.get(k) ?? "").split(",").filter(Boolean);
  const chips = filters.flatMap((f) =>
    values(f.key).map((v) => ({ key: f.key, value: v, label: `${f.label}: ${f.options?.find((o) => o.value === v)?.label ?? v}` })),
  );

  return (
    <div className="mb-3 flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <form
          role="search"
          className="relative min-w-0 flex-1 basis-56"
          onSubmit={(e) => {
            e.preventDefault();
            window.clearTimeout(timer.current);
            setLastPushed(q.trim());
            go({ q: q.trim() || null });
          }}
        >
          <label className="sr-only" htmlFor="list-q">{placeholder}</label>
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-neutral-400" aria-hidden />
          <input id="list-q" value={q} onChange={(e) => onSearch(e.target.value)} placeholder={placeholder} className={cx(field, "w-full pl-8")} type="search" />
          {navigating && <Loader2 className="absolute right-2.5 top-1/2 size-4 -translate-y-1/2 animate-spin text-neutral-400" aria-label="Loading" />}
        </form>
        {filters.map((f) =>
          f.type === "date" ? (
            <label key={f.key} className="inline-flex items-center gap-1.5 text-xs text-neutral-600">
              {f.label}
              <input type="date" className={field} value={values(f.key)[0] ?? ""} onChange={(e) => go({ [f.key]: e.target.value || null })} />
            </label>
          ) : f.type === "multi" ? (
            <MultiSelect key={f.key} def={f} selected={values(f.key)} onChange={(v) => go({ [f.key]: v.join(",") || null })} />
          ) : (
            <select key={f.key} aria-label={f.label} className={field} value={values(f.key)[0] ?? ""} onChange={(e) => go({ [f.key]: e.target.value || null })}>
              <option value="">{f.label}: any</option>
              {f.options?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          ),
        )}
        {sorts && (
          <select
            aria-label="Sort"
            className={cx(field, !sortAlways && "md:hidden")}
            value={`${sp.get("sort") ?? ""}:${sp.get("dir") ?? ""}`}
            onChange={(e) => {
              const [sort, dir] = e.target.value.split(":");
              go({ sort: sort || null, dir: dir || null });
            }}
          >
            <option value=":">Sort: default</option>
            {sorts.flatMap((s) => [
              <option key={`${s.value}:desc`} value={`${s.value}:desc`}>{s.label} ↓</option>,
              <option key={`${s.value}:asc`} value={`${s.value}:asc`}>{s.label} ↑</option>,
            ])}
          </select>
        )}
        {exportKind && (
          <button
            type="button"
            disabled={exporting}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-neutral-300 bg-white px-3 text-sm font-medium hover:bg-neutral-50 disabled:opacity-50"
            onClick={() =>
              startExport(async () => {
                const res = await exportListCsvAction(exportKind, sp.toString());
                if (res.csv) {
                  const url = URL.createObjectURL(new Blob([res.csv], { type: "text/csv;charset=utf-8" }));
                  Object.assign(document.createElement("a"), { href: url, download: res.file }).click();
                  URL.revokeObjectURL(url);
                  toast.success(`Exported ${res.count} row${res.count === 1 ? "" : "s"}.`);
                } else toast.error(res.error ?? "Export failed.");
              })
            }
          >
            {exporting ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />} Export CSV
          </button>
        )}
        <SavedViews path={path} query={sp.toString()} onPick={(query) => start(() => router.replace(`${path}${query ? `?${query}` : ""}` as Route, { scroll: false }))} />
        {children}
      </div>
      {(chips.length > 0 || sp.get("q")) && (
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          {sp.get("q") && <Chip label={`Search: ${sp.get("q")}`} onRemove={() => { setQ(""); setLastPushed(""); go({ q: null }); }} />}
          {chips.map((c) => (
            <Chip key={`${c.key}:${c.value}`} label={c.label} onRemove={() => go({ [c.key]: values(c.key).filter((v) => v !== c.value).join(",") || null })} />
          ))}
          <button
            type="button"
            className="ml-1 text-neutral-600 underline underline-offset-4 hover:text-neutral-900"
            onClick={() => {
              setQ("");
              setLastPushed("");
              go(Object.fromEntries([["q", null], ...filters.map((f) => [f.key, null])]));
            }}
          >
            Clear all
          </button>
        </div>
      )}
    </div>
  );
}

function Chip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-neutral-200/70 py-0.5 pl-2.5 pr-1 text-neutral-800">
      {label}
      <button type="button" onClick={onRemove} aria-label={`Remove ${label}`} className="rounded-full p-0.5 hover:bg-neutral-300"><X className="size-3" /></button>
    </span>
  );
}

function MultiSelect({ def, selected, onChange }: { def: FilterDef; selected: string[]; onChange: (v: string[]) => void }) {
  return (
    <details className="group relative">
      <summary className={cx(field, "inline-flex cursor-pointer list-none items-center gap-1.5 [&::-webkit-details-marker]:hidden")}>
        {def.label}
        {selected.length > 0 && <span className="rounded-full bg-neutral-900 px-1.5 text-[11px] text-white">{selected.length}</span>}
        <ChevronDown className="size-3.5 text-neutral-500" aria-hidden />
      </summary>
      <div className="absolute left-0 top-10 z-20 flex max-h-72 w-56 flex-col gap-0.5 overflow-y-auto rounded-lg border border-neutral-200 bg-white p-1.5 shadow-lg">
        {def.options?.map((o) => (
          <label key={o.value} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-neutral-50">
            <input type="checkbox" className="size-4" checked={selected.includes(o.value)} onChange={(e) => onChange(e.target.checked ? [...selected, o.value] : selected.filter((v) => v !== o.value))} />
            {o.label}
          </label>
        ))}
      </div>
    </details>
  );
}

function SavedViews({ path, query, onPick }: { path: string; query: string; onPick: (q: string) => void }) {
  const [views, setViews] = useState<{ id: string; name: string; query: string }[] | null>(null);
  const [name, setName] = useState("");
  const [busy, start] = useTransition();
  const load = () => start(async () => setViews(await listViewsAction(path).catch(() => [])));
  return (
    <details className="relative" onToggle={(e) => (e.currentTarget as HTMLDetailsElement).open && !views && load()}>
      <summary className={cx(field, "inline-flex cursor-pointer list-none items-center gap-1.5 [&::-webkit-details-marker]:hidden")}>
        <Bookmark className="size-4" aria-hidden /> Views <ChevronDown className="size-3.5 text-neutral-500" aria-hidden />
      </summary>
      <div className="absolute right-0 top-10 z-20 flex w-64 flex-col gap-1 rounded-lg border border-neutral-200 bg-white p-2 shadow-lg">
        {busy && !views && <Loader2 className="m-2 size-4 animate-spin text-neutral-400" />}
        {views?.length === 0 && <p className="px-2 py-1 text-xs text-neutral-500">No saved views for this list yet.</p>}
        {views?.map((v) => (
          <div key={v.id} className="flex items-center gap-1">
            <button type="button" onClick={() => onPick(v.query)} className="flex-1 truncate rounded px-2 py-1.5 text-left text-sm hover:bg-neutral-50">{v.name}</button>
            <button
              type="button"
              aria-label={`Delete view ${v.name}`}
              className="rounded p-1 text-neutral-400 hover:text-red-700"
              onClick={() =>
                start(async () => {
                  toast.result(await deleteViewAction(v.id));
                  setViews(await listViewsAction(path));
                })
              }
            >
              <Trash2 className="size-3.5" />
            </button>
          </div>
        ))}
        <form
          className="mt-1 flex gap-1 border-t border-neutral-100 pt-2"
          onSubmit={(e) => {
            e.preventDefault();
            start(async () => {
              const res = await saveViewAction(path, name, query);
              toast.result(res);
              if (res.ok) {
                setName("");
                setViews(await listViewsAction(path));
              }
            });
          }}
        >
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Save current view as…" maxLength={40} className="h-8 min-w-0 flex-1 rounded border border-neutral-300 px-2 text-sm" aria-label="View name" />
          <button type="submit" disabled={!name.trim() || busy} className="h-8 rounded bg-neutral-900 px-2 text-xs font-medium text-white disabled:opacity-50">Save</button>
        </form>
      </div>
    </details>
  );
}
