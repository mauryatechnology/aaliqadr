import Link from "next/link";
import type { Route } from "next";
import type { ReactNode } from "react";
import { ChevronRight } from "lucide-react";

/** Server-side layout pieces (plan.md §2.5). */

export function Breadcrumbs({ items }: { items: { label: string; href?: string }[] }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-2 flex flex-wrap items-center gap-1 text-sm text-neutral-500">
      {items.map((it, i) => (
        <span key={i} className="inline-flex items-center gap-1">
          {i > 0 && <ChevronRight className="size-3.5" aria-hidden />}
          {it.href ? <Link href={it.href as Route} className="hover:text-neutral-900 hover:underline">{it.label}</Link> : <span aria-current="page" className="text-neutral-800">{it.label}</span>}
        </span>
      ))}
    </nav>
  );
}

export function KeyValue({ rows, cols = 2 }: { rows: [string, ReactNode][]; cols?: 1 | 2 }) {
  return (
    <dl className={cols === 2 ? "grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-[max-content_1fr_max-content_1fr]" : "grid grid-cols-[max-content_1fr] gap-x-6 gap-y-2 text-sm"}>
      {rows.map(([k, v]) => (
        <div key={k} className="contents">
          <dt className="text-neutral-500">{k}</dt>
          <dd className="min-w-0 break-words text-neutral-900">{v}</dd>
        </div>
      ))}
    </dl>
  );
}
