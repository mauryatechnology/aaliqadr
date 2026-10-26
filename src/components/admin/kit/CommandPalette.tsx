"use client";

import { useRouter } from "next/navigation";
import type { Route } from "next";
import { useEffect, useRef, useState, useTransition } from "react";
import { CornerDownLeft, Loader2, Search } from "lucide-react";
import { globalSearchAction, type SearchHit } from "@/actions/admin/search";
import { cx } from "@/lib/cx";

/**
 * ⌘K / Ctrl+K command palette and the keyboard shortcuts (plan.md §4): jump to any page,
 * search orders, products and customers live, or start a common action. `?` lists shortcuts.
 */

type Command = { label: string; href: string; group: "Go to" | "Create"; keys?: string };

const PAGES: Command[] = [
  { label: "Dashboard", href: "/admin", group: "Go to", keys: "g d" },
  { label: "Orders", href: "/admin/orders", group: "Go to", keys: "g o" },
  { label: "Orders to ship", href: "/admin/orders?status=confirmed,processing", group: "Go to" },
  { label: "Returns & claims", href: "/admin/returns", group: "Go to", keys: "g r" },
  { label: "Products", href: "/admin/products", group: "Go to", keys: "g p" },
  { label: "Bulk edit products", href: "/admin/products/bulk", group: "Go to" },
  { label: "Inventory", href: "/admin/inventory", group: "Go to", keys: "g i" },
  { label: "Low stock", href: "/admin/inventory?stock=low", group: "Go to" },
  { label: "Stock ledger", href: "/admin/inventory/ledger", group: "Go to" },
  { label: "Categories", href: "/admin/categories", group: "Go to" },
  { label: "Collections", href: "/admin/collections", group: "Go to" },
  { label: "HSN codes", href: "/admin/hsn", group: "Go to" },
  { label: "Customers", href: "/admin/customers", group: "Go to", keys: "g c" },
  { label: "Reviews waiting", href: "/admin/reviews", group: "Go to" },
  { label: "Content", href: "/admin/content", group: "Go to" },
  { label: "Coupons", href: "/admin/coupons", group: "Go to" },
  { label: "Shipping", href: "/admin/shipping", group: "Go to" },
  { label: "Invoices", href: "/admin/invoices", group: "Go to" },
  { label: "Reports & GST", href: "/admin/reports", group: "Go to" },
  { label: "Staff & roles", href: "/admin/staff", group: "Go to" },
  { label: "Settings", href: "/admin/settings", group: "Go to" },
  { label: "System health", href: "/admin/health", group: "Go to" },
  { label: "Email templates", href: "/admin/email-preview", group: "Go to" },
  { label: "Activity log", href: "/admin/audit", group: "Go to" },
  { label: "New product", href: "/admin/products/new", group: "Create", keys: "n" },
  { label: "New collection", href: "/admin/collections/new", group: "Create" },
];

const SHORTCUTS: [string, string][] = [
  ["⌘K / Ctrl+K", "Open this palette"],
  ["/", "Search the current list"],
  ["g then o / p / i / c / r / d", "Go to orders / products / inventory / customers / returns / dashboard"],
  ["n", "New product"],
  ["j / k", "Next / previous row in a list"],
  ["Enter", "Open the highlighted row"],
  ["?", "Show these shortcuts"],
];

const typing = (el: EventTarget | null) => el instanceof HTMLElement && (el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName));

export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [help, setHelp] = useState(false);
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [active, setActive] = useState(0);
  const [pending, start] = useTransition();
  const dialog = useRef<HTMLDialogElement>(null);
  const helpDialog = useRef<HTMLDialogElement>(null);
  const timer = useRef<number>(undefined);

  // Global keys: palette, "g x" chords, list navigation.
  useEffect(() => {
    let chord = false;
    let chordTimer: number | undefined;
    const rowIndex = { i: -1 };
    const rows = () => [...document.querySelectorAll<HTMLElement>("main tbody tr, main [data-list-row]")];
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
        return;
      }
      if (typing(e.target) || e.metaKey || e.ctrlKey || e.altKey) return;
      if (chord) {
        chord = false;
        const to = { o: "/admin/orders", p: "/admin/products", i: "/admin/inventory", c: "/admin/customers", r: "/admin/returns", d: "/admin" }[e.key];
        if (to) {
          e.preventDefault();
          router.push(to as Route);
        }
        return;
      }
      if (e.key === "g") {
        chord = true;
        window.clearTimeout(chordTimer);
        chordTimer = window.setTimeout(() => (chord = false), 1200);
      } else if (e.key === "?") {
        e.preventDefault();
        setHelp(true);
      } else if (e.key === "/") {
        const box = document.getElementById("list-q");
        if (box) {
          e.preventDefault();
          box.focus();
        }
      } else if (e.key === "n") {
        e.preventDefault();
        router.push("/admin/products/new");
      } else if (e.key === "j" || e.key === "k") {
        const list = rows();
        if (!list.length) return;
        e.preventDefault();
        list[rowIndex.i]?.removeAttribute("data-kbd");
        rowIndex.i = Math.max(0, Math.min(list.length - 1, rowIndex.i + (e.key === "j" ? 1 : -1)));
        const row = list[rowIndex.i]!;
        row.setAttribute("data-kbd", "");
        row.scrollIntoView({ block: "nearest" });
      } else if (e.key === "Enter" && rowIndex.i >= 0) {
        const link = rows()[rowIndex.i]?.querySelector<HTMLAnchorElement>("a[href]");
        if (link) {
          e.preventDefault();
          link.click();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router]);

  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  useEffect(() => {
    const d = helpDialog.current;
    if (!d) return;
    if (help && !d.open) d.showModal();
    if (!help && d.open) d.close();
  }, [help]);

  const t = q.trim().toLowerCase();
  const commands = PAGES.filter((c) => !t || c.label.toLowerCase().includes(t)).slice(0, t ? 6 : 10);
  const items: { label: string; sub?: string; href: string; group: string }[] = [
    ...hits.map((h) => ({ label: h.title, sub: h.sub, href: h.href, group: h.kind === "order" ? "Orders" : h.kind === "product" ? "Products" : "Customers" })),
    ...commands.map((c) => ({ label: c.label, sub: c.keys, href: c.href, group: c.group })),
  ];

  function onType(v: string) {
    setQ(v);
    setActive(0);
    window.clearTimeout(timer.current);
    if (v.trim().length < 2) return setHits([]);
    timer.current = window.setTimeout(() => start(async () => setHits(await globalSearchAction(v).catch(() => []))), 200);
  }
  function go(href: string) {
    setOpen(false);
    setQ("");
    setHits([]);
    router.push(href as Route);
  }

  return (
    <>
      <dialog
        ref={dialog}
        aria-label="Command palette"
        onClose={() => setOpen(false)}
        onClick={(e) => e.target === dialog.current && setOpen(false)}
        className="mx-auto mt-[12vh] w-[min(94vw,600px)] rounded-xl border border-neutral-200 bg-white p-0 text-neutral-900 shadow-2xl backdrop:bg-neutral-900/40"
      >
        {open && (
          <div className="flex flex-col">
            <div className="flex items-center gap-2 border-b border-neutral-200 px-3">
              <Search className="size-4 text-neutral-400" aria-hidden />
              <input
                autoFocus
                role="combobox"
                aria-expanded="true"
                aria-controls="palette-list"
                aria-activedescendant={items[active] ? `palette-${active}` : undefined}
                value={q}
                onChange={(e) => onType(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "ArrowDown") {
                    e.preventDefault();
                    setActive((a) => Math.min(items.length - 1, a + 1));
                  } else if (e.key === "ArrowUp") {
                    e.preventDefault();
                    setActive((a) => Math.max(0, a - 1));
                  } else if (e.key === "Enter" && items[active]) {
                    e.preventDefault();
                    go(items[active]!.href);
                  }
                }}
                placeholder="Search orders, products, customers, or jump to a page…"
                className="h-12 w-full bg-transparent text-sm outline-none"
              />
              {pending && <Loader2 className="size-4 animate-spin text-neutral-400" />}
            </div>
            <ul id="palette-list" role="listbox" className="max-h-[50vh] overflow-y-auto p-1.5">
              {items.length === 0 && <li className="px-3 py-6 text-center text-sm text-neutral-500">Nothing found.</li>}
              {items.map((it, i) => (
                <li key={`${it.href}-${i}`} id={`palette-${i}`} role="option" aria-selected={i === active}>
                  {(i === 0 || items[i - 1]!.group !== it.group) && <p className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-neutral-400">{it.group}</p>}
                  <button type="button" onMouseEnter={() => setActive(i)} onClick={() => go(it.href)} className={cx("flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-sm", i === active && "bg-neutral-100")}>
                    <span className="min-w-0"><span className="block truncate font-medium">{it.label}</span></span>
                    <span className="flex shrink-0 items-center gap-2 text-xs text-neutral-500">{it.sub && <span className="max-w-60 truncate">{it.sub}</span>}{i === active && <CornerDownLeft className="size-3.5" />}</span>
                  </button>
                </li>
              ))}
            </ul>
            <p className="border-t border-neutral-200 px-3 py-2 text-xs text-neutral-500">↑↓ to move · Enter to open · Esc to close · <button type="button" className="underline" onClick={() => { setOpen(false); setHelp(true); }}>Shortcuts</button></p>
          </div>
        )}
      </dialog>
      <dialog ref={helpDialog} aria-label="Keyboard shortcuts" onClose={() => setHelp(false)} onClick={(e) => e.target === helpDialog.current && setHelp(false)} className="m-auto w-[min(92vw,460px)] rounded-xl border border-neutral-200 bg-white p-5 text-neutral-900 shadow-2xl backdrop:bg-neutral-900/40">
        <h2 className="mb-3 text-base font-semibold">Keyboard shortcuts</h2>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
          {SHORTCUTS.map(([k, v]) => (
            <div key={k} className="contents">
              <dt><kbd className="rounded border border-neutral-300 bg-neutral-50 px-1.5 py-0.5 font-mono text-xs">{k}</kbd></dt>
              <dd className="text-neutral-700">{v}</dd>
            </div>
          ))}
        </dl>
        <button type="button" onClick={() => setHelp(false)} className="mt-4 inline-flex h-9 items-center rounded-lg border border-neutral-300 px-4 text-sm">Close</button>
      </dialog>
    </>
  );
}

/** Small button in the sidebar that opens the palette (for mouse and touch users). */
export function PaletteHint() {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", ctrlKey: true }))}
      className="flex w-full items-center justify-between gap-2 rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-sm text-neutral-500 hover:border-neutral-400"
    >
      <span className="inline-flex items-center gap-2"><Search className="size-4" /> Search…</span>
      <kbd className="font-mono text-[11px]">⌘K</kbd>
    </button>
  );
}
