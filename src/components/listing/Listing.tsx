import Link from "next/link";
import type { Route } from "next";
import type { ReactNode } from "react";
import { X } from "lucide-react";
import { ELEMENT_INFO, ELEMENTS, SIGNS } from "@/config/zodiac";
import { cn } from "@/lib/cn";
import { applyFacets, facetCounts, isIndexable, parseFacets, PRICE_BUCKETS, SIZE_BUCKETS, SORTS, sortCards, toggleHref, type FacetKey, type FacetState } from "@/lib/facets";
import { BADGES, type CategoryDTO, type ProductCardDTO } from "@/server/catalog/types";
import { descendantIds } from "@/server/queries/catalog";
import { ProductGrid } from "@/components/product/ProductGrid";
import { FilterSheet, SortSelect } from "./ListingControls";

/**
 * Product listing with faceted filters (plan.md §9.3), shared by shop, search, category and
 * collection pages. Everything is computed on the server from the cached catalogue and kept in
 * the URL; the browser only opens the mobile sheet and changes the sort.
 */

export const PAGE = 24;
const FAMILY_LABEL = (f: string) => f.charAt(0).toUpperCase() + f.slice(1);
const CONC_LABEL: Record<string, string> = { extrait: "Extrait de Parfum", edp: "Eau de Parfum", edt: "Eau de Toilette" };

type Params = Record<string, string | string[] | undefined>;
type Group = { key: FacetKey; label: string; single?: boolean; options: { value: string; label: string }[] };

export function Listing({
  cards,
  base,
  params,
  categories,
  hide = [],
  relevance = false,
  empty,
}: {
  cards: ProductCardDTO[];
  base: string;
  params: Params;
  categories: CategoryDTO[];
  /** Facets fixed by the page itself (e.g. a sign page doesn't offer "sign"). */
  hide?: FacetKey[];
  /** Search results arrive in relevance order; "Featured" keeps it. */
  relevance?: boolean;
  empty?: ReactNode;
}) {
  const one = (k: string) => (Array.isArray(params[k]) ? params[k]![0] : params[k]) ?? "";
  const state: FacetState = parseFacets(params);
  for (const k of hide) delete state[k];
  // Custom price range from the min/max form.
  const pmin = one("pmin").replace(/\D/g, "");
  const pmax = one("pmax").replace(/\D/g, "");
  if (pmin || pmax) state.price = [...(state.price ?? []), `${pmin}-${pmax}`];
  const sort = SORTS.some((s) => s.value === one("sort")) ? one("sort") : "";
  const page = Math.min(50, Math.max(1, Number(one("page")) || 1));

  const bySlug = new Map(categories.map((c) => [c.slug, c]));
  const ctx = { categoryIds: (slug: string) => (bySlug.get(slug) ? descendantIds(categories, bySlug.get(slug)!.id) : undefined) };
  const filtered = applyFacets(cards, state, ctx);
  const sorted = sort || !relevance ? sortCards(filtered, sort) : filtered;
  const shown = sorted.slice(0, page * PAGE);

  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (typeof v === "string" && v) sp.set(k, v);
  const present = <T,>(xs: T[]) => [...new Set(xs)].filter(Boolean) as NonNullable<T>[];
  const usedCats = categories.filter((c) => cards.some((p) => p.categoryId && descendantIds(categories, c.id).has(p.categoryId)));

  const groups: Group[] = (
    [
      { key: "category", label: "Category", options: usedCats.map((c) => ({ value: c.slug, label: c.name })) },
      { key: "sign", label: "Zodiac sign", options: SIGNS.filter((s) => cards.some((c) => c.zodiacSign === s.slug)).map((s) => ({ value: s.slug, label: `${s.name} · ${s.rashi}` })) },
      { key: "element", label: "Element", options: ELEMENTS.filter((e) => cards.some((c) => c.element === e)).map((e) => ({ value: e, label: ELEMENT_INFO[e].label })) },
      { key: "family", label: "Note family", options: present(cards.flatMap((c) => c.noteFamilies)).sort().map((f) => ({ value: f, label: FAMILY_LABEL(f) })) },
      { key: "conc", label: "Concentration", options: present(cards.map((c) => c.concentration)).map((c) => ({ value: c, label: CONC_LABEL[c] ?? c })) },
      { key: "size", label: "Size", options: [...SIZE_BUCKETS.map((b) => ({ value: b.value, label: b.label })), { value: "set", label: "Sets & gift boxes" }] },
      { key: "price", label: "Price", options: PRICE_BUCKETS.map((b) => ({ value: b.value, label: b.label })) },
      { key: "rating", label: "Rating", single: true, options: [{ value: "4", label: "4 ★ & up" }] },
      { key: "badge", label: "Highlights", options: present(cards.flatMap((c) => c.badges)).map((b) => ({ value: b, label: BADGES[b] })) },
      { key: "offer", label: "Offers", single: true, options: [{ value: "yes", label: "On offer" }] },
      { key: "stock", label: "Availability", single: true, options: [{ value: "in", label: "In stock" }] },
    ] satisfies Group[]
  ).filter((g) => !hide.includes(g.key) && g.options.length > 0);

  const counted = groups.map((g) => ({ ...g, counts: facetCounts(cards, state, ctx, g.key, g.options.map((o) => o.value)) })).filter((g) => g.options.length > 1 || Object.values(g.counts).some((n) => n > 0));
  const chips = (Object.entries(state) as [FacetKey, string[]][]).flatMap(([k, vs]) =>
    vs.map((v) => {
      const g = groups.find((x) => x.key === k);
      const label = g?.options.find((o) => o.value === v)?.label ?? (k === "price" ? `₹${v.replace("-", " – ₹")}` : v);
      const href = k === "price" && /^\d*-\d*$/.test(v) ? (() => { const n = new URLSearchParams(sp); n.delete("pmin"); n.delete("pmax"); n.delete("page"); return `${base}${n.size ? `?${n}` : ""}`; })() : toggleHref(base, sp, k, v);
      return { key: `${k}:${v}`, label, href };
    }),
  );
  const clearAll = (() => {
    const n = new URLSearchParams();
    if (sp.get("q")) n.set("q", sp.get("q")!);
    if (sort) n.set("sort", sort);
    return `${base}${n.size ? `?${n}` : ""}`;
  })();
  const more = (() => {
    const n = new URLSearchParams(sp);
    n.set("page", String(page + 1));
    return `${base}?${n}`;
  })();

  const rail = (
    <div className="flex flex-col divide-y divide-gold/10 rounded-2xl border border-gold/20 bg-surface/60 p-4 sm:p-5 backdrop-blur-md shadow-[0_12px_36px_rgba(0,0,0,0.35)]">
      <div className="pb-3.5 flex items-center justify-between border-b border-gold/10">
        <span className="font-caps text-[10.5px] uppercase tracking-[0.24em] text-gold font-medium flex items-center gap-1.5">
          <span className="text-[9px]">✦</span> Refine Selection
        </span>
        {chips.length > 0 && (
          <Link
            href={clearAll as Route}
            scroll={false}
            className="font-caps text-[9.5px] uppercase tracking-[0.18em] text-muted hover:text-gold transition-colors"
          >
            Reset ({chips.length})
          </Link>
        )}
      </div>
      {counted.map((g) => (
        <details
          key={g.key}
          open={g.key === "category" || g.key === "family" || !!state[g.key]?.length || g.key === "price"}
          className="group py-3.5"
        >
          <summary className="font-caps flex cursor-pointer list-none items-center justify-between text-[11px] uppercase tracking-[0.22em] text-ivory/90 hover:text-gold transition-colors [&::-webkit-details-marker]:hidden">
            <span className="flex items-center gap-2">
              <span className="size-1 rounded-full bg-gold/50 group-open:bg-gold transition-colors" />
              {g.label}
            </span>
            <div className="flex items-center gap-2">
              {state[g.key]?.length ? (
                <span className="rounded-full border border-gold/40 bg-gold/15 px-2 py-0.5 font-sans text-[10px] text-gold font-medium">
                  {state[g.key]!.length}
                </span>
              ) : null}
              <span className="text-gold/60 text-xs transition-transform duration-200 group-open:rotate-180">▾</span>
            </div>
          </summary>
          <ul className="mt-3 flex flex-col gap-1">
            {g.options.map((o) => {
              const on = !!state[g.key]?.includes(o.value);
              const n = g.counts[o.value] ?? 0;
              return (
                <li key={o.value}>
                  <Link
                    href={toggleHref(base, sp, g.key, o.value, g.single) as Route}
                    scroll={false}
                    rel="nofollow"
                    aria-current={on ? "true" : undefined}
                    className={cn(
                      "flex items-center justify-between gap-2 px-2.5 py-1.5 text-xs transition-all duration-200 rounded-lg",
                      on ? "bg-gold/[0.10] text-gold font-medium" : "text-ivory/80 hover:bg-surface/80 hover:text-ivory",
                      n === 0 && !on && "opacity-35 pointer-events-none"
                    )}
                  >
                    <span className="flex items-center gap-2.5">
                      <span
                        aria-hidden
                        className={cn(
                          "grid size-3.5 place-items-center rounded-[3px] border text-[9px] transition-colors",
                          on
                            ? "border-gold bg-gold text-obsidian shadow-[0_0_8px_rgba(201,169,110,0.5)]"
                            : "border-gold/30 bg-surface/80 group-hover:border-gold/60"
                        )}
                      >
                        {on ? "✓" : ""}
                      </span>
                      <span className="tracking-wide">{o.label}</span>
                    </span>
                    <span className="text-[11px] tabular-nums text-muted/70">{n}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
          {g.key === "price" && (
            <form action={base} className="mt-3 flex items-center gap-1.5 px-2 text-xs">
              {[...sp.entries()].filter(([k]) => !["price", "pmin", "pmax", "page"].includes(k)).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
              <input
                name="pmin"
                inputMode="numeric"
                placeholder="Min ₹"
                defaultValue={pmin}
                aria-label="Minimum price"
                className="h-8 w-20 rounded-lg border border-gold/25 bg-surface/80 px-2 text-ivory placeholder:text-muted/50 text-xs focus:border-gold focus:outline-none"
              />
              <span aria-hidden className="text-muted/60">–</span>
              <input
                name="pmax"
                inputMode="numeric"
                placeholder="Max ₹"
                defaultValue={pmax}
                aria-label="Maximum price"
                className="h-8 w-20 rounded-lg border border-gold/25 bg-surface/80 px-2 text-ivory placeholder:text-muted/50 text-xs focus:border-gold focus:outline-none"
              />
              <button className="h-8 rounded-lg border border-gold/40 bg-gold/10 px-3 font-caps text-[10px] uppercase tracking-wider text-gold hover:bg-gold/20 hover:border-gold transition-colors">Go</button>
            </form>
          )}
        </details>
      ))}
    </div>
  );

  return (
    <>
      {!isIndexable(state, sort, page) && <meta name="robots" content="noindex, follow" />}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[260px_minmax(0,1fr)]">
        <FilterSheet count={filtered.length} activeCount={chips.length} clearHref={clearAll}>
          {rail}
        </FilterSheet>
        <div className="min-w-0">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-gold/10 pb-4">
            <div className="flex items-center gap-3">
              <span className="size-1.5 rounded-full bg-gold animate-pulse" />
              <p className="font-caps text-[11px] uppercase tracking-[0.24em] text-ivory/90" aria-live="polite">
                <span className="text-gold font-medium">{filtered.length}</span> {filtered.length === 1 ? "Fragrance Available" : "Fragrances Available"}
              </p>
            </div>
            <SortSelect value={sort} options={[...SORTS]} />
          </div>
          {chips.length > 0 && (
            <div className="mb-6 flex flex-wrap items-center gap-2 text-xs">
              <span className="font-caps text-[10px] uppercase tracking-[0.18em] text-muted mr-1">Active:</span>
              {chips.map((c) => (
                <Link
                  key={c.key}
                  href={c.href as Route}
                  scroll={false}
                  rel="nofollow"
                  className="inline-flex min-h-[32px] items-center gap-1.5 rounded-full border border-gold/35 bg-gold/[0.08] py-1 pl-3 pr-2.5 font-caps text-[10px] uppercase tracking-[0.16em] text-gold hover:border-gold hover:bg-gold/20 transition-all active:scale-95"
                  aria-label={`Remove ${c.label}`}
                >
                  <span>{c.label}</span>
                  <X className="size-3 text-gold/80 hover:text-gold" aria-hidden />
                </Link>
              ))}
              <Link
                href={clearAll as Route}
                scroll={false}
                className="ml-2 min-h-[32px] inline-flex items-center font-caps text-[10.5px] uppercase tracking-[0.18em] text-muted underline underline-offset-4 hover:text-gold transition-colors"
              >
                Clear all
              </Link>
            </div>
          )}
          {shown.length ? (
            <>
              <ProductGrid items={shown} />
              {sorted.length > shown.length && (
                <div className="mt-14 flex flex-col items-center gap-3">
                  <p className="font-caps text-[10px] uppercase tracking-[0.22em] text-muted">Showing {shown.length} of {sorted.length} creations</p>
                  <Link
                    href={more as Route}
                    scroll={false}
                    className="min-h-[44px] inline-flex items-center justify-center rounded-full border border-gold/45 bg-gold/[0.08] px-8 py-3 font-caps text-xs uppercase tracking-[0.24em] text-gold hover:bg-gold/20 hover:border-gold transition-all duration-300 active:scale-98 shadow-sm"
                  >
                    Load More Fragrances
                  </Link>
                </div>
              )}
            </>
          ) : (
            (empty ?? (
              <div className="py-20 text-center rounded-2xl border border-gold/20 bg-surface/40 p-8 sm:p-12 backdrop-blur-md">
                <p className="font-display text-2xl sm:text-3xl text-ivory font-light italic mb-2">No celestial signatures found</p>
                <p className="text-sm text-muted mb-6 max-w-md mx-auto">No creations match the selected combination of notes, signs, or filters.</p>
                <Link
                  href={clearAll as Route}
                  className="inline-flex min-h-[44px] items-center rounded-full border border-gold/40 bg-gold/10 px-7 py-2.5 font-caps text-[11px] uppercase tracking-[0.2em] text-gold hover:bg-gold/20 active:scale-98 transition-all"
                >
                  Clear All Filters
                </Link>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}
