"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import type { Route } from "next";
import { useEffect, useRef, useState, useTransition } from "react";
import { ArrowRight, Clock, Loader2, Search, Sparkles, TrendingUp, X } from "lucide-react";
import { suggestAction, trackSearchAction } from "@/actions/search";
import { SIGNS, ZODIAC, type ZodiacSlug } from "@/config/zodiac";
import { ZodiacGoldGlyph } from "@/components/zodiac/ZodiacGoldGlyph";
import { formatPrice } from "@/lib/money";
import { routes } from "@/lib/routes";
import { SEARCH_TRAIL } from "@/lib/cart-store";
import { cx } from "@/lib/cx";
import type { Suggestions } from "@/server/queries/search";

const RASHI_DEVANAGARI: Record<string, string> = {
  aries: "मेष",
  taurus: "वृषभ",
  gemini: "मिथुन",
  cancer: "कर्क",
  leo: "सिंह",
  virgo: "कन्या",
  libra: "तुला",
  scorpio: "वृश्चिक",
  sagittarius: "धनु",
  capricorn: "मकर",
  aquarius: "कुम्भ",
  pisces: "मीन",
};

const RECENT = "aq.recent-searches";
type Item = { key: string; href: string; label: string; sub?: string; image?: string; group: string; slug?: string };

const CURATED_NOTES = [
  "Desert Saffron",
  "Mysore Sandalwood",
  "Damask Rose",
  "Smoked Oud",
  "Coastal Ambergris",
  "Solar Bergamot",
  "Blue Lotus",
  "Vetiver Bourbon",
];

function readRecent(): string[] {
  try {
    return (JSON.parse(localStorage.getItem(RECENT) ?? "[]") as string[]).slice(0, 6);
  } catch {
    return [];
  }
}

/** Highlights the typed text inside a result in radiant gold. */
function Mark({ text, q }: { text: string; q: string }) {
  const i = q ? text.toLowerCase().indexOf(q.toLowerCase()) : -1;
  if (i < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, i)}
      <mark className="bg-transparent text-gold font-medium">{text.slice(i, i + q.length)}</mark>
      {text.slice(i + q.length)}
    </>
  );
}

export function SearchOverlay({
  open,
  onClose,
  popular,
}: {
  open: boolean;
  onClose: () => void;
  popular: string[];
}) {
  const router = useRouter();
  const dialog = useRef<HTMLDialogElement>(null);
  const timer = useRef<number>(undefined);
  const [q, setQ] = useState("");
  const [res, setRes] = useState<Suggestions | null>(null);
  const [error, setError] = useState("");
  const [active, setActive] = useState(-1);
  const [recent, setRecent] = useState<string[]>([]);
  const [pending, start] = useTransition();

  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    if (open && !d.open) {
      d.showModal();
      setRecent(readRecent());
    }
    if (!open && d.open) d.close();
  }, [open]);

  function type(v: string) {
    setQ(v);
    setActive(-1);
    window.clearTimeout(timer.current);
    if (v.trim().length < 2) return setRes(null);
    timer.current = window.setTimeout(
      () =>
        start(async () => {
          const r = await suggestAction(v);
          if ("error" in r) return setError(r.error);
          setError("");
          setRes(r);
        }),
      150
    );
  }

  function remember(term: string) {
    try {
      localStorage.setItem(
        RECENT,
        JSON.stringify([term, ...readRecent().filter((x) => x.toLowerCase() !== term.toLowerCase())].slice(0, 6))
      );
    } catch {
      // ignore
    }
  }

  function go(it: Item) {
    if (q.trim().length >= 2) {
      remember(q.trim());
      if (it.slug) {
        void trackSearchAction({ q: q.trim(), event: "click", slug: it.slug });
        try {
          sessionStorage.setItem(SEARCH_TRAIL, JSON.stringify({ q: q.trim(), slug: it.slug, at: Date.now() }));
        } catch {
          // ignore
        }
      }
    }
    onClose();
    router.push(it.href as Route);
  }

  function submit(term = q.trim()) {
    if (!term) return;
    remember(term);
    onClose();
    router.push(`/search?q=${encodeURIComponent(term)}` as Route);
  }

  const items: Item[] = res
    ? [
        ...res.products.map((p) => ({
          key: `p${p.slug}`,
          href: routes.product(p.slug),
          label: p.name,
          sub: `${p.sign ? `${ZODIAC[p.sign as ZodiacSlug]?.name} · ` : ""}from ${formatPrice(p.priceP)}`,
          image: p.image,
          group: "Fragrances",
          slug: p.slug,
        })),
        ...res.signs.map((s) => ({
          key: `s${s.slug}`,
          href: routes.sign(s.slug as ZodiacSlug),
          label: `${s.name} · ${s.rashi}`,
          group: "Zodiac Signs",
        })),
        ...res.categories.map((c) => ({
          key: `c${c.slug}`,
          href: routes.category(c.slug),
          label: c.name,
          group: "Categories",
        })),
        ...res.collections.map((c) => ({
          key: `k${c.slug}`,
          href: `/collections/${c.slug}`,
          label: c.name,
          group: "Collections",
        })),
        ...res.notes.map((n) => ({
          key: `n${n}`,
          href: `/search?q=${encodeURIComponent(n)}`,
          label: n,
          sub: "Fragrances composed with this accord",
          group: "Olfactory Notes",
        })),
      ]
    : [];
  const total = res ? res.products.length : 0;

  return (
    <dialog
      ref={dialog}
      aria-label="Search the stars"
      onClose={onClose}
      onClick={(e) => e.target === dialog.current && onClose()}
      className="mx-auto mt-0 h-dvh max-h-dvh w-full max-w-full bg-[#0E0C14]/98 p-0 text-ivory backdrop:bg-black/85 backdrop:backdrop-blur-md sm:mt-[7vh] sm:h-auto sm:max-h-[85vh] sm:max-w-3xl sm:rounded-2xl sm:border sm:border-gold/35 shadow-[0_25px_80px_rgba(0,0,0,0.95)] overflow-hidden"
    >
      <div className="flex h-full flex-col">
        {/* Search Input Bar */}
        <form
          role="search"
          onSubmit={(e) => {
            e.preventDefault();
            if (active >= 0 && items[active]) go(items[active]!);
            else submit();
          }}
          className="flex items-center gap-3.5 border-b border-gold/20 bg-bg/98 px-5 py-3 sm:px-6 shadow-xs"
        >
          <Search className="size-5 text-gold shrink-0 stroke-[1.8]" aria-hidden />
          <input
            autoFocus
            role="combobox"
            aria-expanded={items.length > 0}
            aria-controls="search-results"
            aria-activedescendant={active >= 0 ? `sr-${active}` : undefined}
            aria-autocomplete="list"
            value={q}
            onChange={(e) => type(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setActive((a) => Math.min(items.length - 1, a + 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setActive((a) => Math.max(-1, a - 1));
              }
            }}
            maxLength={60}
            placeholder="A sign, a rashi, a note or a fragrance..."
            className="h-14 flex-1 bg-transparent font-display text-lg sm:text-xl text-ivory outline-none placeholder:font-sans placeholder:text-sm sm:placeholder:text-base placeholder:text-ivory/50 placeholder:font-normal"
          />
          {pending && <Loader2 className="size-4 animate-spin text-gold shrink-0" aria-label="Searching" />}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close search"
            className="flex size-8.5 items-center justify-center rounded-full border border-gold/30 bg-surface/70 text-ivory/80 hover:border-gold hover:bg-gold/15 hover:text-gold transition-all shrink-0 cursor-pointer active:scale-95"
          >
            <X className="size-4" strokeWidth={1.8} />
          </button>
        </form>

        {/* Content Body */}
        <div className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-6 [scrollbar-width:thin]">
          <p className="sr-only" aria-live="polite">
            {res ? `${total} fragrance${total === 1 ? "" : "s"} found` : ""}
          </p>
          {error && <p className="p-4 text-sm text-red-300">{error}</p>}

          {/* Initial State: Rich Luxury Exploration Guides */}
          {!res && (
            <div className="flex flex-col gap-6">
              {/* Find My Sign Callout Banner */}
              <button
                type="button"
                onClick={() => go({ key: "fms", href: "/find-my-sign", label: "", group: "" })}
                className="group flex w-full items-center justify-between rounded-xl border border-gold/35 bg-gradient-to-r from-gold/15 via-gold/10 to-transparent p-4 sm:p-4.5 transition-all duration-300 hover:border-gold hover:from-gold/25 shadow-xs cursor-pointer active:scale-99 text-left"
              >
                <span className="flex items-center gap-2.5 font-caps text-xs sm:text-[13px] uppercase tracking-[0.2em] text-gold font-semibold">
                  <Sparkles className="size-4 text-gold shrink-0" />
                  <span>Not sure of your sign? Calculate from your birth date</span>
                </span>
                <ArrowRight className="size-4 text-gold transition-transform duration-300 group-hover:translate-x-1 shrink-0" />
              </button>

              {/* Recent Searches */}
              {recent.length > 0 && (
                <section>
                  <p className="font-caps text-xs uppercase tracking-[0.24em] text-gold font-semibold mb-3 flex items-center gap-2">
                    <Clock className="size-3.5 text-gold" /> Recent Searches
                  </p>
                  <div className="flex flex-wrap gap-2.5">
                    {recent.map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => submit(r)}
                        className="rounded-full border border-gold/25 bg-surface/80 px-3.5 py-1.5 font-caps text-xs uppercase tracking-[0.16em] text-ivory/90 font-medium transition-all duration-200 hover:border-gold hover:text-gold hover:bg-gold/10 shadow-2xs cursor-pointer active:scale-95"
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </section>
              )}

              {/* Popular Search Keywords */}
              {popular.length > 0 && (
                <section>
                  <p className="font-caps text-xs uppercase tracking-[0.24em] text-gold font-semibold mb-3 flex items-center gap-2">
                    <TrendingUp className="size-3.5 text-gold" /> Trending Inquiries
                  </p>
                  <div className="flex flex-wrap gap-2.5">
                    {popular.map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => submit(p)}
                        className="rounded-full border border-gold/25 bg-surface/80 px-3.5 py-1.5 font-caps text-xs uppercase tracking-[0.16em] text-ivory/90 font-medium transition-all duration-200 hover:border-gold hover:text-gold hover:bg-gold/10 shadow-2xs cursor-pointer active:scale-95"
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </section>
              )}

              {/* The Twelve Signs Grid */}
              <section>
                <p className="font-caps text-xs sm:text-[12.5px] uppercase tracking-[0.24em] text-gold font-semibold mb-3.5 flex items-center gap-2">
                  <span className="text-[10px]">✦</span>
                  <span>EXPLORE BY ZODIAC SIGN &amp; RASHI</span>
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                  {SIGNS.map((s) => (
                    <button
                      key={s.slug}
                      type="button"
                      onClick={() => go({ key: `s-${s.slug}`, href: routes.sign(s.slug), label: s.name, group: "Signs" })}
                      className="group flex items-center gap-2.5 rounded-xl border border-gold/25 bg-surface/80 p-2.5 sm:px-3 sm:py-2.5 text-left transition-all duration-200 hover:border-gold hover:bg-surface hover:-translate-y-0.5 hover:shadow-md active:scale-98 cursor-pointer shadow-2xs"
                    >
                      <span className="flex size-7 shrink-0 items-center justify-center rounded-full border border-gold/35 bg-obsidian/90 text-gold shadow-xs group-hover:scale-110 group-hover:border-gold transition-transform">
                        <ZodiacGoldGlyph sign={s.slug as ZodiacSlug} className="size-4" />
                      </span>
                      <div className="flex items-baseline gap-1.5 min-w-0">
                        <span className="text-xs sm:text-[13px] font-medium text-ivory/95 group-hover:text-gold transition-colors truncate">
                          {s.name}
                        </span>
                        <span className="font-rashi text-xs text-gold-soft/90 font-medium whitespace-nowrap">
                          ({RASHI_DEVANAGARI[s.slug] ?? s.rashi})
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </section>

              {/* Popular Olfactory Notes */}
              <section>
                <p className="font-caps text-xs sm:text-[12.5px] uppercase tracking-[0.24em] text-gold font-semibold mb-3.5 flex items-center gap-2">
                  <span className="text-[10px]">✦</span>
                  <span>NOBLE BOTANICALS &amp; ACCORDS</span>
                </p>
                <div className="flex flex-wrap gap-2.5">
                  {CURATED_NOTES.map((note) => (
                    <button
                      key={note}
                      type="button"
                      onClick={() => submit(note)}
                      className="rounded-full border border-gold/30 bg-surface/85 px-4 py-2 font-caps text-xs sm:text-[12.5px] uppercase tracking-[0.16em] text-ivory/90 font-medium transition-all duration-200 hover:border-gold hover:bg-gold/15 hover:text-gold active:scale-95 shadow-xs cursor-pointer"
                    >
                      {note}
                    </button>
                  ))}
                </div>
              </section>
            </div>
          )}

          {/* No results feedback */}
          {res && items.length === 0 && (
            <div className="py-12 text-center border border-dashed border-gold/15 bg-surface/30 p-6">
              <p className="font-display text-xl text-ivory font-light italic mb-1.5">
                No signatures match &ldquo;{q}&rdquo;
              </p>
              <p className="text-xs text-muted mb-4 font-light">
                Try searching for a zodiac sign, rashi, or botanical accord (e.g. Saffron, Oud, Leo).
              </p>
              {res.suggestion && (
                <button
                  type="button"
                  onClick={() => type(res.suggestion!)}
                  className="font-caps text-[10.5px] uppercase tracking-[0.2em] text-gold underline underline-offset-4 hover:text-ivory"
                >
                  Did you mean &ldquo;{res.suggestion}&rdquo;?
                </button>
              )}
            </div>
          )}

          {/* Autocomplete Suggestions List */}
          <ul id="search-results" role="listbox" aria-label="Suggestions" className="flex flex-col gap-1.5">
            {items.map((it, i) => (
              <li key={it.key} id={`sr-${i}`} role="option" aria-selected={i === active}>
                {(i === 0 || items[i - 1]!.group !== it.group) && (
                  <p className="font-caps text-xs uppercase tracking-[0.24em] text-gold font-semibold border-b border-gold/20 pb-1.5 pt-4 mb-2.5">
                    {it.group}
                  </p>
                )}
                <button
                  type="button"
                  onMouseEnter={() => setActive(i)}
                  onClick={() => go(it)}
                  className={cx(
                    "flex w-full items-center gap-3.5 rounded-xl border p-3 text-left transition-all duration-200 cursor-pointer",
                    i === active
                      ? "border-gold/50 bg-gold/[0.12] text-ivory shadow-xs"
                      : "border-transparent hover:border-gold/35 hover:bg-surface/90 text-ivory/95"
                  )}
                >
                  {it.group === "Fragrances" && (
                    <span className="relative size-12 shrink-0 overflow-hidden rounded-lg border border-gold/30 bg-surface shadow-2xs">
                      {it.image ? <Image src={it.image} alt="" fill sizes="48px" className="object-cover" /> : null}
                    </span>
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm sm:text-base font-medium text-ivory">
                      <Mark text={it.label} q={q.trim()} />
                    </span>
                    {it.sub && (
                      <span className="block truncate font-caps text-xs uppercase tracking-[0.16em] text-gold font-medium mt-0.5">
                        {it.sub}
                      </span>
                    )}
                  </span>
                  <ChevronArrow />
                </button>
              </li>
            ))}
          </ul>

          {res && total > 0 && (
            <div className="mt-4 pt-3 border-t border-gold/10 text-center">
              <button
                type="button"
                onClick={() => submit()}
                className="font-caps text-xs uppercase tracking-[0.2em] text-gold underline underline-offset-4 hover:text-ivory transition-colors"
              >
                View all results for &ldquo;{q.trim()}&rdquo; →
              </button>
            </div>
          )}
        </div>
      </div>
    </dialog>
  );
}

function ChevronArrow() {
  return (
    <svg className="size-3.5 text-gold/60 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
    </svg>
  );
}
