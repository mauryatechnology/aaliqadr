/**
 * URL ↔ list state for every admin list (plan.md §2.2): search, filters, sort and paging live
 * in the query string, so a view survives refresh, can be shared and works with Back. Pure.
 */

export type Params = Record<string, string | string[] | undefined>;
export const PAGE_SIZES = [25, 50, 100] as const;
export type PageSize = (typeof PAGE_SIZES)[number];

export interface ListSpec {
  /** Sort keys the list accepts (the first is the default unless `defaultSort` is set). */
  sorts: readonly string[];
  defaultSort?: string;
  defaultDir?: "asc" | "desc";
  /** Filter keys; values are comma-separated in the URL (multi-select). */
  filters: readonly string[];
}

export interface ListState {
  q: string;
  page: number;
  size: PageSize;
  sort: string;
  dir: "asc" | "desc";
  f: Record<string, string[]>;
}

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export function parseList(sp: Params, spec: ListSpec): ListState {
  const sortRaw = one(sp.sort);
  const sort = spec.sorts.includes(sortRaw) ? sortRaw : (spec.defaultSort ?? spec.sorts[0] ?? "");
  const dirRaw = one(sp.dir);
  const dir = dirRaw === "asc" || dirRaw === "desc" ? dirRaw : (spec.defaultDir ?? "desc");
  const sizeRaw = Number(one(sp.size));
  const size = (PAGE_SIZES as readonly number[]).includes(sizeRaw) ? (sizeRaw as PageSize) : 25;
  const f: Record<string, string[]> = {};
  for (const k of spec.filters) {
    const vals = one(sp[k])
      .split(",")
      .map((x) => x.trim().slice(0, 80))
      .filter(Boolean)
      .slice(0, 20);
    if (vals.length) f[k] = vals;
  }
  return { q: one(sp.q).trim().slice(0, 80), page: Math.min(10_000, Math.max(1, Math.floor(Number(one(sp.page))) || 1)), size, sort, dir, f };
}

/** The query string for a state, leaving defaults out so URLs stay short. */
export function listQuery(state: ListState, spec: ListSpec, patch: Partial<ListState> = {}): string {
  const s = { ...state, ...patch, f: { ...state.f, ...(patch.f ?? {}) } };
  const p = new URLSearchParams();
  if (s.q) p.set("q", s.q);
  for (const k of spec.filters) if (s.f[k]?.length) p.set(k, s.f[k]!.join(","));
  if (s.sort && s.sort !== (spec.defaultSort ?? spec.sorts[0])) p.set("sort", s.sort);
  if (s.dir !== (spec.defaultDir ?? "desc")) p.set("dir", s.dir);
  if (s.size !== 25) p.set("size", String(s.size));
  if (s.page > 1) p.set("page", String(s.page));
  const q = p.toString();
  return q ? `?${q}` : "";
}

/** Next sort state when a column header is clicked: desc → asc → back to default. */
export function nextSort(state: ListState, spec: ListSpec, key: string): Pick<ListState, "sort" | "dir" | "page"> {
  const def = spec.defaultSort ?? spec.sorts[0] ?? "";
  if (state.sort !== key) return { sort: key, dir: "desc", page: 1 };
  if (state.dir === "desc") return { sort: key, dir: "asc", page: 1 };
  return { sort: def, dir: spec.defaultDir ?? "desc", page: 1 };
}

export const skipOf = (s: ListState) => (s.page - 1) * s.size;

/** Escapes user text for a case-insensitive Mongo regex. */
export const rx = (s: string) => ({ $regex: s.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&").slice(0, 80), $options: "i" });

/** A date filter value (YYYY-MM-DD, India time) as a Date: start of day, or end with `end`. */
export function istDay(v: string | undefined, end = false): Date | undefined {
  if (!v || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return undefined;
  const d = new Date(`${v}T${end ? "23:59:59.999" : "00:00:00"}+05:30`);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

/** `{ $gte, $lte }` for a from/to pair of filter values, or undefined when neither is set. */
export function dateRange(f: Record<string, string[]>, fromKey = "from", toKey = "to") {
  const from = istDay(f[fromKey]?.[0]);
  const to = istDay(f[toKey]?.[0], true);
  if (!from && !to) return undefined;
  return { ...(from ? { $gte: from } : {}), ...(to ? { $lte: to } : {}) };
}
