import Link from "next/link";
import type { Route } from "next";
import type { ReactNode } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { cn } from "@/lib/cn";
import { listQuery, nextSort, PAGE_SIZES, type ListSpec, type ListState } from "@/lib/list-params";

/**
 * Server-driven table (plan.md §2.2): the URL holds sort and page, headers are sort links
 * with `aria-sort`, the header sticks, and under `md` each row can render as a card.
 */

export interface Column<R> {
  key: string;
  label: string;
  /** Sort key from the list spec, when the column can sort. */
  sort?: string;
  align?: "right" | "center";
  className?: string;
  cell: (row: R) => ReactNode;
}

export const thCls = "sticky top-0 z-[1] border-b border-neutral-200 bg-neutral-50 px-(--adm-px) py-2 text-[11px] font-semibold uppercase tracking-wide text-neutral-600";
export const tdCls = "border-b border-neutral-100 px-(--adm-px) py-(--adm-py) align-middle text-neutral-800";

export function DataTable<R>({
  base,
  spec,
  state,
  total,
  rows,
  columns,
  rowKey,
  mobile,
  empty,
  minWidth = 720,
  select,
}: {
  base: string;
  spec: ListSpec;
  state: ListState;
  total: number;
  rows: R[];
  columns: Column<R>[];
  rowKey: (r: R) => string;
  /** Card layout for small screens; without it the table scrolls sideways. */
  mobile?: (r: R) => ReactNode;
  empty: ReactNode;
  minWidth?: number;
  /**
   * Row checkboxes for bulk actions. They belong to the form with this id (rendered by a
   * client bulk bar), so the table itself stays a server component.
   */
  select?: { form: string; value: (r: R) => string };
}) {
  const href = (patch: Partial<ListState>) => `${base}${listQuery(state, spec, patch)}` as Route;
  if (!rows.length) return <>{empty}</>;
  const from = (state.page - 1) * state.size + 1;
  const to = Math.min(total, state.page * state.size);
  const pages = Math.max(1, Math.ceil(total / state.size));

  return (
    <div className="flex flex-col gap-3">
      {mobile && <ul className="flex flex-col gap-2 md:hidden">{rows.map((r) => <li key={rowKey(r)} className="rounded-lg border border-neutral-200 bg-white p-3 text-sm">{mobile(r)}</li>)}</ul>}
      <div className={cn("max-h-[calc(100dvh-14rem)] overflow-auto rounded-xl border border-neutral-200 bg-white shadow-sm", mobile && "hidden md:block")}>
        <table className="w-full border-separate border-spacing-0 text-left text-sm" style={{ minWidth }}>
          <thead>
            <tr>
              {select && (
                <th scope="col" className={cn(thCls, "w-8")}>
                  <input type="checkbox" form={select.form} data-select-all aria-label="Select all on this page" className="size-4" />
                </th>
              )}
              {columns.map((c) => {
                const active = c.sort && state.sort === c.sort;
                const Icon = active ? (state.dir === "asc" ? ArrowUp : ArrowDown) : ArrowUpDown;
                return (
                  <th key={c.key} scope="col" aria-sort={active ? (state.dir === "asc" ? "ascending" : "descending") : undefined} className={cn(thCls, c.align === "right" && "text-right", c.align === "center" && "text-center", c.className)}>
                    {c.sort ? (
                      <Link href={href(nextSort(state, spec, c.sort))} className={cn("inline-flex items-center gap-1 hover:text-neutral-900", active && "text-neutral-900")} scroll={false}>
                        {c.label} <Icon className={cn("size-3", !active && "opacity-40")} aria-hidden />
                      </Link>
                    ) : (
                      c.label
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={rowKey(r)} className="hover:bg-neutral-50 has-[:checked]:bg-sky-50/60">
                {select && (
                  <td className={cn(tdCls, "w-8")}>
                    <input type="checkbox" form={select.form} name="ids" value={select.value(r)} aria-label={`Select ${select.value(r)}`} className="size-4" />
                  </td>
                )}
                {columns.map((c) => (
                  <td key={c.key} className={cn(tdCls, c.align === "right" && "text-right tabular-nums", c.align === "center" && "text-center", c.className)}>{c.cell(r)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination total={total} from={from} to={to} page={state.page} pages={pages} size={state.size} href={href} />
    </div>
  );
}

export function Pagination({ total, from, to, page, pages, size, href }: { total: number; from: number; to: number; page: number; pages: number; size: number; href: (p: Partial<ListState>) => Route }) {
  const near = [...new Set([1, page - 1, page, page + 1, pages])].filter((p) => p >= 1 && p <= pages).sort((a, b) => a - b);
  const pill = "inline-flex h-8 min-w-8 items-center justify-center rounded-md border px-2 text-sm";
  return (
    <nav aria-label="Pagination" className="flex flex-wrap items-center justify-between gap-2 text-sm text-neutral-600">
      <span className="tabular-nums">{from.toLocaleString("en-IN")}–{to.toLocaleString("en-IN")} of {total.toLocaleString("en-IN")}</span>
      <div className="flex flex-wrap items-center gap-1">
        <span className="mr-2 inline-flex items-center gap-1 text-xs">
          Rows
          {PAGE_SIZES.map((s) => (
            <Link key={s} href={href({ size: s, page: 1 })} aria-current={s === size ? "true" : undefined} className={cn("rounded px-1.5 py-0.5", s === size ? "bg-neutral-900 text-white" : "hover:bg-neutral-200")} scroll={false}>{s}</Link>
          ))}
        </span>
        {pages > 1 && (
          <>
            {page > 1 ? <Link href={href({ page: page - 1 })} className={cn(pill, "border-neutral-300 bg-white hover:bg-neutral-50")} aria-label="Previous page">‹</Link> : <span className={cn(pill, "border-neutral-200 text-neutral-300")}>‹</span>}
            {near.map((p, i) => (
              <span key={p} className="inline-flex items-center gap-1">
                {i > 0 && near[i - 1]! < p - 1 && <span aria-hidden>…</span>}
                <Link href={href({ page: p })} aria-current={p === page ? "page" : undefined} className={cn(pill, p === page ? "border-neutral-900 bg-neutral-900 text-white" : "border-neutral-300 bg-white hover:bg-neutral-50")}>{p}</Link>
              </span>
            ))}
            {page < pages ? <Link href={href({ page: page + 1 })} className={cn(pill, "border-neutral-300 bg-white hover:bg-neutral-50")} aria-label="Next page">›</Link> : <span className={cn(pill, "border-neutral-200 text-neutral-300")}>›</span>}
          </>
        )}
      </div>
    </nav>
  );
}

/** Status tabs that set one filter (e.g. `status`), with counts. */
export function ListTabs({ base, spec, state, filter, tabs }: { base: string; spec: ListSpec; state: ListState; filter: string; tabs: { value: string; label: string; count?: number }[] }) {
  const current = state.f[filter]?.join(",") ?? "";
  return (
    <nav aria-label="Views" className="mb-3 flex flex-wrap gap-1 border-b border-neutral-200">
      {tabs.map((t) => {
        const on = current === t.value;
        return (
          <Link key={t.value || "all"} href={`${base}${listQuery(state, spec, { page: 1, f: { [filter]: t.value ? t.value.split(",") : [] } })}` as Route} aria-current={on ? "page" : undefined} className={cn("-mb-px border-b-2 px-3 py-2 text-sm font-medium", on ? "border-neutral-900 text-neutral-900" : "border-transparent text-neutral-600 hover:text-neutral-900")}>
            {t.label}
            {t.count !== undefined && <span className="ml-1.5 rounded-full bg-neutral-100 px-1.5 text-xs tabular-nums text-neutral-600">{t.count.toLocaleString("en-IN")}</span>}
          </Link>
        );
      })}
    </nav>
  );
}
