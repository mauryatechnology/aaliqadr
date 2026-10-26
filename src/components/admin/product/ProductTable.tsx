"use client";

import Image from "next/image";
import Link from "next/link";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, Copy, ExternalLink, Pencil } from "lucide-react";
import { ZODIAC, type ZodiacSlug } from "@/config/zodiac";
import { formatPrice } from "@/lib/money";
import { routes } from "@/lib/routes";
import { cn } from "@/lib/cn";
import { bulkAssignProductsAction, bulkEditProductsAction, bulkProductsAction, duplicateProductAction, setProductStatusAction } from "@/actions/admin/products";
import type { FormState } from "@/actions/admin/shared";
import { BADGES, type BadgeKey } from "@/server/catalog/types";
import { Badge, btnSecondary, STATUS_TONE, td, th } from "../ui";
import { FormStatus } from "../FormStatus";
import { ConfirmDialog } from "../kit/Dialog";
import { toast } from "../kit/Toaster";

export interface ProductRow {
  id: string;
  name: string;
  slug: string;
  status: string;
  category?: string;
  image?: string;
  sign?: string;
  variants: number;
  minP: number;
  maxP: number;
  stock: number;
  low: boolean;
  badges: string[];
  prices?: { sku: string; label: string; priceP: number; mrpP: number }[];
}

type SortHead = { href: string; dir?: "asc" | "desc" };

/** Product list with selection, bulk actions and a quick live/draft switch (FlexSell's product table). */
export function ProductTable({
  rows,
  canEdit,
  sort,
  lookups,
}: {
  rows: ProductRow[];
  canEdit: boolean;
  sort?: Record<"name" | "price" | "stock", SortHead>;
  lookups?: { categories: { id: string; label: string }[]; collections: { id: string; name: string }[] };
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [state, setState] = useState<FormState>({});
  const [pending, start] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const allOn = rows.length > 0 && rows.every((r) => selected.has(r.id));

  const run = (fn: () => Promise<FormState>) =>
    start(async () => {
      const res = await fn();
      setState(res);
      toast.result(res);
      if (res.ok) {
        setSelected(new Set());
        setConfirmDelete(false);
        router.refresh();
      }
    });

  const toggle = (id: string) => setSelected((s) => {
    const n = new Set(s);
    if (n.has(id)) n.delete(id);
    else n.add(id);
    return n;
  });

  return (
    <div className="flex flex-col gap-3">
      {selected.size > 0 && canEdit && (
        <div className="sticky top-2 z-10 flex flex-wrap items-center gap-2 rounded-xl border border-neutral-300 bg-white p-2 shadow-md">
          <span className="px-2 text-sm font-medium">{selected.size} selected</span>
          <button type="button" className={cn(btnSecondary, "h-9")} disabled={pending} onClick={() => run(() => bulkProductsAction({ ids: [...selected], action: "active" }))}>Set live</button>
          <button type="button" className={cn(btnSecondary, "h-9")} disabled={pending} onClick={() => run(() => bulkProductsAction({ ids: [...selected], action: "draft" }))}>Set draft</button>
          <button type="button" className={cn(btnSecondary, "h-9")} disabled={pending} onClick={() => run(() => bulkProductsAction({ ids: [...selected], action: "archived" }))}>Archive</button>
          {lookups && (
            <>
              <AssignSelect label="Set category…" options={lookups.categories.map((c) => ({ value: c.id, label: c.label }))} disabled={pending} onPick={(v) => run(() => bulkAssignProductsAction({ ids: [...selected], categoryId: v }))} />
              <AssignSelect label="Add to collection…" options={lookups.collections.map((c) => ({ value: c.id, label: c.name }))} disabled={pending} onPick={(v) => run(() => bulkAssignProductsAction({ ids: [...selected], addCollection: v }))} />
              <AssignSelect label="Badge…" options={Object.entries(BADGES).flatMap(([k, l]) => [{ value: `+${k}`, label: `Add “${l}”` }, { value: `-${k}`, label: `Remove “${l}”` }])} disabled={pending} onPick={(v) => run(() => bulkAssignProductsAction({ ids: [...selected], ...(v.startsWith("+") ? { addBadge: v.slice(1) } : { removeBadge: v.slice(1) }) }))} />
            </>
          )}
          <button type="button" className={cn(btnSecondary, "h-9 text-red-700")} onClick={() => setConfirmDelete(true)}>Delete…</button>
          <ConfirmDialog
            open={confirmDelete}
            title={`Delete ${selected.size} product${selected.size === 1 ? "" : "s"}?`}
            confirmLabel="Delete"
            typeToConfirm={String(selected.size)}
            pending={pending}
            onCancel={() => setConfirmDelete(false)}
            onConfirm={() => run(() => bulkProductsAction({ ids: [...selected], action: "delete" }))}
          >
            Products that appear in orders are archived (hidden) instead of deleted. This can&apos;t be undone.
          </ConfirmDialog>
          <button type="button" className="ml-auto px-2 text-sm text-neutral-600 hover:text-neutral-900" onClick={() => setSelected(new Set())}>Clear</button>
        </div>
      )}
      <FormStatus state={state} />

      {/* Phones: one card per product (plan.md §2.2). */}
      <ul className="flex flex-col gap-2 md:hidden">
        {rows.map((r) => (
          <li key={r.id} className="flex items-center gap-3 rounded-lg border border-neutral-200 bg-white p-3 text-sm">
            <span className="relative size-12 shrink-0 overflow-hidden rounded-lg bg-neutral-100">
              {r.image ? <Image src={r.image} alt="" fill sizes="48px" className="object-cover" /> : <Image src={`/bottles/${r.sign ?? "brand"}.svg`} alt="" fill sizes="48px" className="object-contain p-1" unoptimized />}
            </span>
            <span className="min-w-0 flex-1">
              {canEdit ? <Link href={routes.adminProduct(r.id)} className="block truncate font-medium">{r.name}</Link> : <span className="block truncate font-medium">{r.name}</span>}
              <span className="block text-xs text-neutral-500">{r.minP === r.maxP ? formatPrice(r.minP) : `${formatPrice(r.minP)}+`} · {r.stock === 0 ? "out of stock" : `${r.stock} in stock`}</span>
            </span>
            <Badge tone={STATUS_TONE[r.status]}>{r.status}</Badge>
          </li>
        ))}
      </ul>

      <div className="hidden overflow-x-auto rounded-xl border border-neutral-200 bg-white shadow-sm md:block">
        <table className="w-full min-w-[860px] border-collapse text-left text-sm">
          <thead>
            <tr>
              {canEdit && (
                <th className={cn(th, "w-10")}>
                  <input type="checkbox" aria-label="Select all" className="size-4" checked={allOn} onChange={() => setSelected(allOn ? new Set() : new Set(rows.map((r) => r.id)))} />
                </th>
              )}
              <th className={th} aria-sort={ariaSort(sort?.name)}><SortLink head={sort?.name}>Product</SortLink></th>
              <th className={th}>Category</th>
              <th className={th} aria-sort={ariaSort(sort?.price)}><SortLink head={sort?.price}>Price</SortLink></th>
              <th className={cn(th, "text-right")} aria-sort={ariaSort(sort?.stock)}><SortLink head={sort?.stock}>Stock</SortLink></th>
              <th className={th}>Live</th>
              <th className={cn(th, "text-right")}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const sign = r.sign && r.sign in ZODIAC ? ZODIAC[r.sign as ZodiacSlug] : undefined;
              return (
                <tr key={r.id} className={cn("hover:bg-neutral-50", selected.has(r.id) && "bg-neutral-50")}>
                  {canEdit && (
                    <td className={td}><input type="checkbox" aria-label={`Select ${r.name}`} className="size-4" checked={selected.has(r.id)} onChange={() => toggle(r.id)} /></td>
                  )}
                  <td className={td}>
                    <div className="flex items-center gap-3">
                      <span data-zodiac={r.sign} className="relative size-12 shrink-0 overflow-hidden rounded-lg bg-neutral-100" style={sign ? { background: "radial-gradient(circle at 50% 35%, var(--z-g2), var(--z-bg))" } : undefined}>
                        {r.image ? <Image src={r.image} alt="" fill sizes="48px" className="object-cover" /> : <Image src={`/bottles/${r.sign ?? "brand"}.svg`} alt="" fill sizes="48px" className="object-contain p-1" unoptimized />}
                      </span>
                      <span className="min-w-0">
                        {canEdit ? <Link href={routes.adminProduct(r.id)} className="font-medium underline-offset-4 hover:underline">{r.name}</Link> : <span className="font-medium">{r.name}</span>}
                        <span className="block truncate text-xs text-neutral-500">
                          {sign ? `${sign.name} · ` : ""}{r.variants} variant{r.variants === 1 ? "" : "s"}{r.badges.length ? ` · ${r.badges.map((b) => BADGES[b as BadgeKey] ?? b).join(", ")}` : ""}
                        </span>
                      </span>
                    </div>
                  </td>
                  <td className={cn(td, "text-neutral-600")}>{r.category ?? <span className="text-amber-700">None</span>}</td>
                  <td className={cn(td, "tabular-nums")}>
                    {canEdit && r.prices?.length ? (
                      <PriceEditor id={r.id} name={r.name} prices={r.prices} label={r.minP === r.maxP ? formatPrice(r.minP) : `${formatPrice(r.minP)} – ${formatPrice(r.maxP)}`} />
                    ) : r.minP === r.maxP ? formatPrice(r.minP) : `${formatPrice(r.minP)} – ${formatPrice(r.maxP)}`}
                  </td>
                  <td className={cn(td, "text-right tabular-nums")}>{r.stock === 0 ? <Badge tone="red">Out of stock</Badge> : r.low ? <Badge tone="amber">{r.stock} · low</Badge> : r.stock}</td>
                  <td className={td}>
                    {canEdit && r.status !== "archived" ? (
                      <button
                        type="button"
                        role="switch"
                        aria-checked={r.status === "active"}
                        aria-label={`${r.name} is ${r.status === "active" ? "live" : "a draft"}`}
                        disabled={pending}
                        onClick={() => run(() => setProductStatusAction(r.id, r.status === "active" ? "draft" : "active"))}
                        className={cn("relative inline-flex h-5 w-9 rounded-full transition-colors", r.status === "active" ? "bg-emerald-600" : "bg-neutral-300")}
                      >
                        <span className={cn("absolute top-0.5 size-4 rounded-full bg-white shadow transition-transform", r.status === "active" ? "translate-x-4.5" : "translate-x-0.5")} />
                      </button>
                    ) : (
                      <Badge tone={STATUS_TONE[r.status]}>{r.status}</Badge>
                    )}
                  </td>
                  <td className={cn(td, "text-right")}>
                    <div className="flex justify-end gap-1">
                      {canEdit && <Link href={routes.adminProduct(r.id)} aria-label={`Edit ${r.name}`} title="Edit" className="rounded p-2 text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900"><Pencil className="size-4" /></Link>}
                      {canEdit && (
                        <button type="button" title="Duplicate" aria-label={`Duplicate ${r.name}`} disabled={pending} className="rounded p-2 text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900" onClick={() => start(async () => { const res = await duplicateProductAction(r.id); if (res.id) router.push(routes.adminProduct(res.id)); else setState(res); })}>
                          <Copy className="size-4" />
                        </button>
                      )}
                      {r.status === "active" && <a href={routes.product(r.slug)} target="_blank" rel="noreferrer" title="View in store" aria-label={`View ${r.name} in store`} className="rounded p-2 text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900"><ExternalLink className="size-4" /></a>}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const ariaSort = (h?: SortHead) => (h?.dir ? (h.dir === "asc" ? "ascending" : "descending") : undefined);

function SortLink({ head, children }: { head?: SortHead; children: React.ReactNode }) {
  if (!head) return <>{children}</>;
  const Icon = head.dir === "asc" ? ArrowUp : head.dir === "desc" ? ArrowDown : ArrowUpDown;
  return (
    <Link href={head.href as Route} scroll={false} className={cn("inline-flex items-center gap-1 hover:text-neutral-900", head.dir && "text-neutral-900")}>
      {children} <Icon className={cn("size-3", !head.dir && "opacity-40")} aria-hidden />
    </Link>
  );
}

function AssignSelect({ label, options, onPick, disabled }: { label: string; options: { value: string; label: string }[]; onPick: (v: string) => void; disabled?: boolean }) {
  return (
    <select aria-label={label} disabled={disabled} value="" onChange={(e) => e.target.value && onPick(e.target.value)} className="h-9 rounded-lg border border-neutral-300 bg-white px-2 text-sm">
      <option value="">{label}</option>
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

type Prices = NonNullable<ProductRow["prices"]>;

/**
 * Inline price / MRP edit (plan.md §4). Saved through the normal product save (checks and
 * history apply), with Undo in the toast.
 */
function PriceEditor({ id, name, prices, label }: { id: string; name: string; prices: Prices; label: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState(() => prices.map((p) => ({ ...p, price: String(p.priceP / 100), mrp: String(p.mrpP / 100) })));
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const apply = (list: { sku: string; price: number; mrp: number }[]) => bulkEditProductsAction([{ id, variants: list }]);

  function save() {
    const changed = rows.filter((r, i) => Number(r.price) * 100 !== prices[i]!.priceP || Number(r.mrp) * 100 !== prices[i]!.mrpP);
    if (!changed.length) return setOpen(false);
    start(async () => {
      const res = await apply(changed.map((r) => ({ sku: r.sku, price: Number(r.price), mrp: Number(r.mrp) })));
      if (res.error || res.problems.length) return setError(res.error ?? res.problems[0]!.message);
      setOpen(false);
      router.refresh();
      const before = prices.filter((p) => changed.some((c) => c.sku === p.sku)).map((p) => ({ sku: p.sku, price: p.priceP / 100, mrp: p.mrpP / 100 }));
      toast.success(`${name}: prices updated.`, {
        label: "Undo",
        run: async () => {
          const undo = await apply(before);
          if (undo.error || undo.problems.length) toast.error(undo.error ?? undo.problems[0]!.message);
          else {
            toast.success("Prices restored.");
            router.refresh();
          }
        },
      });
    });
  }

  if (!open)
    return (
      <button type="button" onClick={() => { setOpen(true); setError(""); }} className="rounded px-1 underline decoration-dotted underline-offset-4 hover:bg-neutral-100" title="Edit prices">
        {label}
      </button>
    );
  return (
    <div className="flex min-w-56 flex-col gap-1.5 rounded-lg border border-neutral-300 bg-white p-2 shadow-sm">
      {rows.map((r, i) => (
        <div key={r.sku} className="grid grid-cols-[1fr_4.5rem_4.5rem] items-center gap-1 text-xs">
          <span className="truncate" title={r.sku}>{r.label}</span>
          <input aria-label={`${r.label} price`} type="number" min={1} value={r.price} onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, price: e.target.value } : x)))} className="h-7 rounded border border-neutral-300 px-1 text-right" onKeyDown={(e) => e.key === "Enter" && save()} />
          <input aria-label={`${r.label} MRP`} type="number" min={1} value={r.mrp} onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, mrp: e.target.value } : x)))} className="h-7 rounded border border-neutral-300 px-1 text-right text-neutral-500" onKeyDown={(e) => e.key === "Enter" && save()} />
        </div>
      ))}
      <p className="text-[11px] text-neutral-500">Price · MRP (₹)</p>
      {error && <p role="alert" className="text-xs text-red-700">{error}</p>}
      <div className="flex gap-1">
        <button type="button" onClick={save} disabled={pending} className="h-7 rounded bg-neutral-900 px-2 text-xs font-medium text-white disabled:opacity-50">Save</button>
        <button type="button" onClick={() => setOpen(false)} className="h-7 rounded border border-neutral-300 px-2 text-xs">Cancel</button>
      </div>
    </div>
  );
}
