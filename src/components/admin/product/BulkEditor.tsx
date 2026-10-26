"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Fragment, useMemo, useState, useTransition } from "react";
import { Loader2, Search } from "lucide-react";
import { bulkEditProductsAction, type BulkEditResult } from "@/actions/admin/products";
import { routes } from "@/lib/routes";
import { cn } from "@/lib/cn";
import type { BulkRow } from "@/server/admin/queries";
import { btnPrimary, btnSecondary, inputCls } from "../ui";
import { useUnsavedGuard } from "../useUnsavedGuard";

/**
 * Spreadsheet-style editing of prices, status and category across products (plan.md §8.5).
 * Changed cells are highlighted; saving runs each product through the normal save.
 */

const changedCls = "bg-amber-50 border-amber-400";

/** Enter / Shift+Enter moves down / up the same column. */
function moveInGrid(e: React.KeyboardEvent<HTMLTableSectionElement>) {
  if (e.key !== "Enter") return;
  const el = e.target as HTMLElement;
  const col = el.dataset.col;
  if (!col) return;
  const cells = [...e.currentTarget.querySelectorAll<HTMLElement>(`[data-col="${col}"]`)];
  const next = cells[cells.indexOf(el) + (e.shiftKey ? -1 : 1)];
  if (!next) return;
  e.preventDefault();
  next.focus();
  (next as HTMLInputElement).select?.();
}

export function BulkEditor({ rows, categories }: { rows: BulkRow[]; categories: { id: string; label: string }[] }) {
  const router = useRouter();
  const [value, setValue] = useState(rows);
  const [filter, setFilter] = useState("");
  const [result, setResult] = useState<BulkEditResult | null>(null);
  const [saving, start] = useTransition();
  const original = useMemo(() => new Map(rows.map((r) => [r.id, r])), [rows]);

  const changes = value
    .map((p) => {
      const o = original.get(p.id)!;
      const variants = p.variants
        .map((v, i) => {
          const ov = o.variants[i]!;
          const patch = { sku: v.sku, ...(v.mrp !== ov.mrp ? { mrp: v.mrp } : {}), ...(v.price !== ov.price ? { price: v.price } : {}), ...(v.isActive !== ov.isActive ? { isActive: v.isActive } : {}) };
          return Object.keys(patch).length > 1 ? patch : null;
        })
        .filter((x) => x !== null);
      const badgesChanged = JSON.stringify(p.badges ?? []) !== JSON.stringify(o.badges ?? []);
      const c = {
        id: p.id,
        ...(p.status !== o.status ? { status: p.status } : {}),
        ...(p.categoryId !== o.categoryId ? { categoryId: p.categoryId } : {}),
        ...(badgesChanged ? { badges: p.badges } : {}),
        ...(variants.length ? { variants } : {}),
      };
      return Object.keys(c).length > 1 ? c : null;
    })
    .filter((x) => x !== null);
  useUnsavedGuard(changes.length > 0);

  const setProduct = (id: string, patch: Partial<BulkRow>) => setValue((all) => all.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  const setVariant = (id: string, i: number, patch: Partial<BulkRow["variants"][number]>) =>
    setValue((all) => all.map((p) => (p.id === id ? { ...p, variants: p.variants.map((v, j) => (j === i ? { ...v, ...patch } : v)) } : p)));

  const q = filter.trim().toLowerCase();
  const shown = q ? value.filter((p) => p.name.toLowerCase().includes(q) || p.slug.includes(q) || p.variants.some((v) => v.sku.toLowerCase().includes(q))) : value;
  const num = (s: string) => (s === "" ? 0 : Number(s));

  function save() {
    setResult(null);
    start(async () => {
      const res = await bulkEditProductsAction(changes);
      setResult(res);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-4 pb-24">
      <label className="relative max-w-sm">
        <span className="sr-only">Filter</span>
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400" aria-hidden />
        <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Filter by name, URL or SKU" className={`${inputCls} pl-9`} />
      </label>

      <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white">
        <table className="w-full min-w-[880px] text-left text-sm">
          <thead className="bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
            <tr>
              <th className="px-3 py-2">Product / variant</th>
              <th className="px-2 py-2">Status</th>
              <th className="px-2 py-2">Category</th>
              <th className="px-2 py-2">Badge</th>
              <th className="px-2 py-2">MRP ₹</th>
              <th className="px-2 py-2">Price ₹</th>
              <th className="px-2 py-2">Active</th>
            </tr>
          </thead>
          <tbody onKeyDown={moveInGrid}>
            {shown.map((p) => {
              const o = original.get(p.id)!;
              const badgesChanged = JSON.stringify(p.badges ?? []) !== JSON.stringify(o.badges ?? []);
              return (
                <Fragment key={p.id}>
                  <tr className="border-t border-neutral-200 bg-neutral-50/60">
                    <td className="px-3 py-2 font-medium">
                      <Link href={routes.adminProduct(p.id)} className="hover:underline">{p.name}</Link>
                    </td>
                    <td className="px-2 py-2">
                      <select aria-label={`${p.name} status`} data-col="status" className={cn(inputCls, "h-9 w-32", p.status !== o.status && changedCls)} value={p.status} onChange={(e) => setProduct(p.id, { status: e.target.value as BulkRow["status"] })}>
                        <option value="draft">Draft</option>
                        <option value="active">Active</option>
                        <option value="archived">Archived</option>
                      </select>
                    </td>
                    <td className="px-2 py-2">
                      <select aria-label={`${p.name} category`} data-col="category" className={cn(inputCls, "h-9 w-48", p.categoryId !== o.categoryId && changedCls)} value={p.categoryId} onChange={(e) => setProduct(p.id, { categoryId: e.target.value })}>
                        {!p.categoryId && <option value="">—</option>}
                        {categories.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
                      </select>
                    </td>
                    <td className="px-2 py-2">
                      <select
                        aria-label={`${p.name} badge`}
                        data-col="badge"
                        className={cn(inputCls, "h-9 w-36", badgesChanged && changedCls)}
                        value={p.badges?.[0] ?? ""}
                        onChange={(e) => setProduct(p.id, { badges: e.target.value ? [e.target.value] : [] })}
                      >
                        <option value="">None</option>
                        <option value="bestseller">Bestseller</option>
                        <option value="new">New</option>
                        <option value="limited">Limited</option>
                        <option value="exclusive">Exclusive</option>
                        <option value="gift">Gift</option>
                      </select>
                    </td>
                    <td colSpan={3} />
                  </tr>
                  {p.variants.map((v, i) => {
                    const ov = o.variants[i]!;
                    return (
                      <tr key={v.sku} className="border-t border-neutral-100">
                        <td className="px-3 py-1.5 pl-8 text-neutral-600">
                          {v.label} <span className="font-mono text-xs text-neutral-400">{v.sku}</span>
                        </td>
                        <td colSpan={3} />
                        <td className="px-2 py-1.5">
                          <input aria-label={`${v.sku} MRP`} data-col="mrp" type="number" min={0} className={cn(inputCls, "h-9 w-28", v.mrp !== ov.mrp && changedCls)} value={v.mrp} onChange={(e) => setVariant(p.id, i, { mrp: num(e.target.value) })} />
                        </td>
                        <td className="px-2 py-1.5">
                          <input aria-label={`${v.sku} price`} data-col="price" type="number" min={0} aria-invalid={v.price > v.mrp} className={cn(inputCls, "h-9 w-28 aria-[invalid=true]:border-red-500", v.price !== ov.price && changedCls)} value={v.price} onChange={(e) => setVariant(p.id, i, { price: num(e.target.value) })} />
                        </td>
                        <td className="px-2 py-1.5">
                          <input aria-label={`${v.sku} active`} type="checkbox" className={cn("size-4", v.isActive !== ov.isActive && "outline outline-2 outline-amber-400")} checked={v.isActive} onChange={(e) => setVariant(p.id, i, { isActive: e.target.checked })} />
                        </td>
                      </tr>
                    );
                  })}
                </Fragment>
              );
            })}
          </tbody>
        </table>
        {shown.length === 0 && <p className="p-6 text-center text-sm text-neutral-500">No products match.</p>}
      </div>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-neutral-200 bg-white/95 px-4 py-3 backdrop-blur lg:left-[262px]">
        <div className="mx-auto flex max-w-[1240px] flex-wrap items-center gap-3">
          <div className="min-w-0 flex-1 text-sm" role="status">
            {result?.error ? (
              <p className="text-red-700">{result.error}</p>
            ) : result ? (
              <div>
                <p className={result.problems.length ? "text-amber-800" : "text-emerald-700"}>
                  {result.saved} product{result.saved === 1 ? "" : "s"} saved{result.problems.length ? `, ${result.problems.length} not saved:` : "."}
                </p>
                {result.problems.length > 0 && (
                  <ul className="mt-1 list-disc pl-5 text-xs text-neutral-700">
                    {result.problems.map((x) => <li key={x.id}><strong>{x.name}</strong>: {x.message}</li>)}
                  </ul>
                )}
              </div>
            ) : (
              <p className="text-neutral-500">{changes.length ? `${changes.length} product${changes.length === 1 ? "" : "s"} changed. Enter moves down a column.` : "Change any cell; changed cells are highlighted."}</p>
            )}
          </div>
          <button type="button" className={btnSecondary} disabled={!changes.length || saving} onClick={() => setValue(rows)}>Undo all</button>
          <button type="button" className={btnPrimary} disabled={!changes.length || saving} onClick={save}>
            {saving && <Loader2 className="size-4 animate-spin" />} Save {changes.length || ""} {changes.length === 1 ? "product" : "products"}
          </button>
        </div>
      </div>
    </div>
  );
}
