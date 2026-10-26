import Link from "next/link";
import type { Route } from "next";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/** Small admin UI kit: plain, light, high-contrast and consistent (docs/11 §4). */

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-neutral-900">{title}</h1>
        {description && <p className="mt-1 text-sm text-neutral-600">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Card({ title, children, className, actions }: { title?: string; children: ReactNode; className?: string; actions?: ReactNode }) {
  return (
    <section className={cn("rounded-xl border border-neutral-200 bg-white shadow-sm", className)}>
      {(title || actions) && (
        <div className="flex items-center justify-between gap-3 border-b border-neutral-200 px-4 py-3">
          {title && <h2 className="text-sm font-semibold text-neutral-900">{title}</h2>}
          {actions}
        </div>
      )}
      <div className="p-4">{children}</div>
    </section>
  );
}

export function Stat({ label, value, hint, href }: { label: string; value: string; hint?: string; href?: Route }) {
  const body = (
    <>
      <p className="text-sm text-neutral-600">{label}</p>
      <p className="mt-0.5 text-xl font-semibold tabular-nums text-neutral-900">{value}</p>
      {hint && <p className="mt-1 text-xs text-neutral-500">{hint}</p>}
    </>
  );
  const cls = "rounded-xl border border-neutral-200 bg-white px-4 py-3 shadow-sm";
  return href ? (
    <Link href={href} className={cn(cls, "transition-colors hover:border-neutral-400")}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}

const TONES = {
  neutral: "bg-neutral-100 text-neutral-700 ring-neutral-200",
  green: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  amber: "bg-amber-50 text-amber-800 ring-amber-200",
  blue: "bg-sky-50 text-sky-800 ring-sky-200",
  red: "bg-red-50 text-red-800 ring-red-200",
  violet: "bg-violet-50 text-violet-800 ring-violet-200",
} as const;
export type Tone = keyof typeof TONES;

export function Badge({ tone = "neutral", children }: { tone?: Tone; children: ReactNode }) {
  return <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset", TONES[tone])}>{children}</span>;
}

export const STATUS_TONE: Record<string, Tone> = {
  pending_payment: "amber",
  confirmed: "blue",
  processing: "violet",
  shipped: "blue",
  delivered: "green",
  cancelled: "neutral",
  returned: "red",
  paid: "green",
  pending: "amber",
  failed: "red",
  refunded: "neutral",
  partially_refunded: "amber",
  active: "green",
  draft: "amber",
  archived: "neutral",
  // Returns & claims
  requested: "amber",
  approved: "blue",
  received: "violet",
  replaced: "green",
  rejected: "red",
  closed: "neutral",
};

/** `compact` drops the minimum width, for narrow tables inside half-width cards. */
export function Table({ children, className, compact = false }: { children: ReactNode; className?: string; compact?: boolean }) {
  return (
    <div className={cn("overflow-x-auto rounded-xl border border-neutral-200 bg-white shadow-sm", className)}>
      <table className={cn("w-full border-collapse text-left text-sm", !compact && "min-w-[640px]")}>{children}</table>
    </div>
  );
}
export const th = "border-b border-neutral-200 bg-neutral-50 px-(--adm-px) py-2 text-[11px] font-semibold uppercase tracking-wide text-neutral-600";
export const td = "border-b border-neutral-100 px-(--adm-px) py-(--adm-py) align-middle text-neutral-800";

/** Empty state with an optional next step (plan.md §2.2). */
export function Empty({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-neutral-300 bg-white px-6 py-10 text-center">
      <p className="font-medium text-neutral-900">{title}</p>
      {children && <div className="text-sm text-neutral-600">{children}</div>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export const inputCls =
  "h-10 w-full rounded-lg border border-neutral-300 bg-white px-3 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900/10 disabled:bg-neutral-100";
export const btnPrimary =
  "inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-neutral-900 px-4 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50";
export const btnSecondary =
  "inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-neutral-300 bg-white px-4 text-sm font-medium text-neutral-800 hover:bg-neutral-50 disabled:opacity-50";
export const btnDanger = "inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-red-600 px-4 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50";

export function FieldLabel({ label, hint, children, className, error }: { label: string; hint?: string; children: ReactNode; className?: string; error?: string }) {
  return (
    <label className={cn("flex flex-col gap-1.5", className)}>
      <span className="text-sm font-medium text-neutral-800">{label}</span>
      {children}
      {hint && !error && <span className="text-xs text-neutral-500">{hint}</span>}
      {error && <span className="text-xs text-red-700">{error}</span>}
    </label>
  );
}

/** Placeholder while an admin page loads its data (each page wraps itself in Suspense). */
export function AdminSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true" aria-label="Loading">
      <div className="flex flex-col gap-2">
        <div className="h-7 w-56 animate-pulse rounded-md bg-neutral-200" />
        <div className="h-4 w-80 max-w-full animate-pulse rounded-md bg-neutral-200" />
      </div>
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-28 animate-pulse rounded-xl bg-neutral-200" />
        ))}
      </div>
      <div className="h-80 animate-pulse rounded-xl bg-neutral-200" />
    </div>
  );
}
