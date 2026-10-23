"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Copy, ExternalLink, Loader2, Pencil } from "lucide-react";
import { ZODIAC, type ZodiacSlug } from "@/config/zodiac";
import { formatPrice } from "@/lib/money";
import { routes } from "@/lib/routes";
import { cn } from "@/lib/cn";
import { bulkProductsAction, duplicateProductAction, setProductStatusAction } from "@/actions/admin/products";
import type { FormState } from "@/actions/admin/shared";
import { BADGES, type BadgeKey } from "@/server/catalog/types";
import { Badge, btnDanger, btnSecondary, STATUS_TONE, td, th } from "../ui";
import { FormStatus } from "../FormStatus";

export interface ProductRow {
  id: string;
  name: string;
  slug: string;
  status: string;
  category?: string;
  image?: string;
  sign?: ZodiacSlug;
  variants: number;
  minP: number;
  maxP: number;
  stock: number;
  low: boolean;
  badges: BadgeKey[];
}

/** Product list with selection, bulk actions and a quick live/draft switch (FlexSell's product table). */
export function ProductTable({ rows, canEdit }: { rows: ProductRow[]; canEdit: boolean }) {
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
          {confirmDelete ? (
            <span className="flex items-center gap-2 text-sm text-red-800">
              Delete {selected.size}? Products with orders are archived instead.
              <button type="button" className={cn(btnDanger, "h-9")} disabled={pending} onClick={() => run(() => bulkProductsAction({ ids: [...selected], action: "delete" }))}>{pending && <Loader2 className="size-4 animate-spin" />} Delete</button>
              <button type="button" className={cn(btnSecondary, "h-9")} onClick={() => setConfirmDelete(false)}>Cancel</button>
            </span>
          ) : (
            <button type="button" className={cn(btnSecondary, "h-9 text-red-700")} onClick={() => setConfirmDelete(true)}>Delete…</button>
          )}
          <button type="button" className="ml-auto px-2 text-sm text-neutral-600 hover:text-neutral-900" onClick={() => setSelected(new Set())}>Clear</button>
        </div>
      )}
      <FormStatus state={state} />

      <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white shadow-sm">
        <table className="w-full min-w-[860px] border-collapse text-left text-sm">
          <thead>
            <tr>
              {canEdit && (
                <th className={cn(th, "w-10")}>
                  <input type="checkbox" aria-label="Select all" className="size-4" checked={allOn} onChange={() => setSelected(allOn ? new Set() : new Set(rows.map((r) => r.id)))} />
                </th>
              )}
              <th className={th}>Product</th>
              <th className={th}>Category</th>
              <th className={th}>Price</th>
              <th className={cn(th, "text-right")}>Stock</th>
              <th className={th}>Live</th>
              <th className={cn(th, "text-right")}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const sign = r.sign ? ZODIAC[r.sign] : undefined;
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
                          {sign ? `${sign.name} · ` : ""}{r.variants} variant{r.variants === 1 ? "" : "s"}{r.badges.length ? ` · ${r.badges.map((b) => BADGES[b]).join(", ")}` : ""}
                        </span>
                      </span>
                    </div>
                  </td>
                  <td className={cn(td, "text-neutral-600")}>{r.category ?? <span className="text-amber-700">None</span>}</td>
                  <td className={cn(td, "tabular-nums")}>{r.minP === r.maxP ? formatPrice(r.minP) : `${formatPrice(r.minP)} – ${formatPrice(r.maxP)}`}</td>
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
