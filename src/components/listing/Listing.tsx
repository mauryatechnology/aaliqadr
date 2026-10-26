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
    <div className="flex flex-col divide-y divide-white/10">
      {counted.map((g) => (
        <details key={g.key} open={g.key === "category" || g.key === "family" || !!state[g.key]?.length || g.key === "price"} className="group py-3">
          <summary className="font-caps flex cursor-pointer list-none items-center justify-between text-xs uppercase tracking-[0.2em] text-fg [&::-webkit-details-marker]:hidden">
            {g.label}
            {state[g.key]?.length ? <span className="rounded-full bg-gold px-1.5 text-[10px] text-obsidian">{state[g.key]!.length}</span> : null}
          </summary>
          <ul className="mt-2 flex flex-col gap-0.5">
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
                    className={cn("flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-white/5", n === 0 && !on && "opacity-40")}
                  >
                    <span className="flex items-center gap-2">
                      <span aria-hidden className={cn("grid size-4 place-items-center rounded border", on ? "border-gold bg-gold text-obsidian" : "border-white/30")}>{on ? "✓" : ""}</span>
                      {o.label}
                    </span>
                    <span className="text-xs tabular-nums text-muted">{n}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
          {g.key === "price" && (
            <form action={base} className="mt-2 flex items-center gap-1.5 px-2 text-sm">
              {[...sp.entries()].filter(([k]) => !["price", "pmin", "pmax", "page"].includes(k)).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
              <input name="pmin" inputMode="numeric" placeholder="Min ₹" defaultValue={pmin} aria-label="Minimum price" className="h-8 w-20 rounded border border-white/15 bg-transparent px-2" />
              <span aria-hidden>–</span>
              <input name="pmax" inputMode="numeric" placeholder="Max ₹" defaultValue={pmax} aria-label="Maximum price" className="h-8 w-20 rounded border border-white/15 bg-transparent px-2" />
              <button className="h-8 rounded-full border border-white/20 px-3 text-xs hover:border-gold">Go</button>
            </form>
          )}
        </details>
      ))}
    </div>
  );

  return (
    <>
      {!isIndexable(state, sort, page) && <meta name="robots" content="noindex, follow" />}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[240px_minmax(0,1fr)]">
        <FilterSheet count={filtered.length} activeCount={chips.length} clearHref={clearAll}>
          {rail}
        </FilterSheet>
        <div className="min-w-0">
          <div className="sticky top-16 z-10 -mx-4 mb-4 flex flex-wrap items-center justify-between gap-3 bg-[var(--z-bg)]/85 px-4 py-2 backdrop-blur sm:static sm:mx-0 sm:bg-transparent sm:px-0 sm:py-0 sm:backdrop-blur-none">
            <p className="text-sm text-muted" aria-live="polite">
              {filtered.length} {filtered.length === 1 ? "fragrance" : "fragrances"}
            </p>
            <SortSelect value={sort} options={[...SORTS]} />
          </div>
          {chips.length > 0 && (
            <div className="mb-5 flex flex-wrap items-center gap-2 text-xs">
              {chips.map((c) => (
                <Link key={c.key} href={c.href as Route} scroll={false} rel="nofollow" className="inline-flex items-center gap-1 rounded-full border border-white/20 py-1 pl-3 pr-2 hover:border-gold" aria-label={`Remove ${c.label}`}>
                  {c.label} <X className="size-3" aria-hidden />
                </Link>
              ))}
              <Link href={clearAll as Route} scroll={false} className="ml-1 underline underline-offset-4 hover:text-gold">Clear all</Link>
            </div>
          )}
          {shown.length ? (
            <>
              <ProductGrid items={shown} />
              {sorted.length > shown.length && (
                <div className="mt-10 flex flex-col items-center gap-2">
                  <p className="text-xs text-muted">Showing {shown.length} of {sorted.length}</p>
                  <Link href={more as Route} scroll={false} className="rounded-full border border-white/20 px-6 py-3 text-xs uppercase tracking-[0.2em] hover:border-gold">Load more</Link>
                </div>
              )}
            </>
          ) : (
            (empty ?? (
              <p className="text-muted">
                Nothing matches these filters. <Link href={clearAll as Route} className="underline underline-offset-4">Clear them</Link>.
              </p>
            ))
          )}
        </div>
      </div>
    </>
  );
}

