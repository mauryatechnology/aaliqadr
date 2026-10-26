"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import type { Route } from "next";
import { useEffect, useRef, useState, useTransition } from "react";
import { Clock, Loader2, Search, TrendingUp, X } from "lucide-react";
import { suggestAction, trackSearchAction } from "@/actions/search";
import { ZODIAC, type ZodiacSlug } from "@/config/zodiac";
import { formatPrice } from "@/lib/money";
import { routes } from "@/lib/routes";
import { SEARCH_TRAIL } from "@/lib/cart-store";
import { cx } from "@/lib/cx";
import type { Suggestions } from "@/server/queries/search";

const RECENT = "aq.recent-searches";
type Item = { key: string; href: string; label: string; sub?: string; image?: string; group: string; slug?: string };

function readRecent(): string[] {
  try {
    return (JSON.parse(localStorage.getItem(RECENT) ?? "[]") as string[]).slice(0, 6);
  } catch {
    return [];
  }
}

/** Highlights the typed text inside a result. */
function Mark({ text, q }: { text: string; q: string }) {
  const i = q ? text.toLowerCase().indexOf(q.toLowerCase()) : -1;
  if (i < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, i)}
      <mark className="bg-transparent text-gold">{text.slice(i, i + q.length)}</mark>
      {text.slice(i + q.length)}
    </>
  );
}

export function SearchOverlay({ open, onClose, popular }: { open: boolean; onClose: () => void; popular: string[] }) {
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
      150,
    );
  }

  function remember(term: string) {
    try {
      localStorage.setItem(RECENT, JSON.stringify([term, ...readRecent().filter((x) => x.toLowerCase() !== term.toLowerCase())].slice(0, 6)));
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
        ...res.products.map((p) => ({ key: `p${p.slug}`, href: routes.product(p.slug), label: p.name, sub: `${p.sign ? `${ZODIAC[p.sign as ZodiacSlug]?.name} · ` : ""}from ${formatPrice(p.priceP)}`, image: p.image, group: "Fragrances", slug: p.slug })),
        ...res.signs.map((s) => ({ key: `s${s.slug}`, href: routes.sign(s.slug as ZodiacSlug), label: `${s.name} · ${s.rashi}`, group: "Signs" })),
        ...res.categories.map((c) => ({ key: `c${c.slug}`, href: routes.category(c.slug), label: c.name, group: "Categories" })),
        ...res.collections.map((c) => ({ key: `k${c.slug}`, href: `/collections/${c.slug}`, label: c.name, group: "Collections" })),
        ...res.notes.map((n) => ({ key: `n${n}`, href: `/search?q=${encodeURIComponent(n)}`, label: n, sub: "Fragrances with this note", group: "Notes" })),
      ]
    : [];
  const total = res ? res.products.length : 0;

  return (
    <dialog
      ref={dialog}
      aria-label="Search"
      onClose={onClose}
      onClick={(e) => e.target === dialog.current && onClose()}
      className="mx-auto mt-0 h-dvh max-h-dvh w-full max-w-full bg-[var(--z-bg)] p-0 text-fg backdrop:bg-black/70 sm:mt-[10vh] sm:h-auto sm:max-h-[80vh] sm:max-w-2xl sm:rounded-2xl sm:border sm:border-white/10"
    >
      <div className="flex h-full flex-col">
        <form
          role="search"
          onSubmit={(e) => {
            e.preventDefault();
            if (active >= 0 && items[active]) go(items[active]!);
            else submit();
          }}
          className="flex items-center gap-3 border-b border-white/10 px-4"
        >
          <Search className="size-5 text-muted" aria-hidden />
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
            placeholder="A sign, a rashi, a note or a fragrance"
            className="h-16 flex-1 bg-transparent text-lg outline-none placeholder:text-muted"
          />
          {pending && <Loader2 className="size-4 animate-spin text-muted" aria-label="Searching" />}
          <button type="button" onClick={onClose} aria-label="Close search" className="rounded-full p-2 hover:bg-white/5"><X className="size-5" /></button>
        </form>
        <div className="min-h-0 flex-1 overflow-y-auto p-2">
          <p className="sr-only" aria-live="polite">{res ? `${total} fragrance${total === 1 ? "" : "s"} found` : ""}</p>
          {error && <p className="p-4 text-sm text-muted">{error}</p>}
          {!res && (
            <div className="flex flex-col gap-5 p-3">
              {recent.length > 0 && (
                <section>
                  <p className="eyebrow mb-2 flex items-center gap-1.5"><Clock className="size-3.5" /> Recent</p>
                  <div className="flex flex-wrap gap-2">{recent.map((r) => <button key={r} type="button" onClick={() => submit(r)} className="rounded-full border border-white/15 px-3 py-1.5 text-sm hover:border-gold">{r}</button>)}</div>
                </section>
              )}
              {popular.length > 0 && (
                <section>
                  <p className="eyebrow mb-2 flex items-center gap-1.5"><TrendingUp className="size-3.5" /> Popular</p>
                  <div className="flex flex-wrap gap-2">{popular.map((r) => <button key={r} type="button" onClick={() => submit(r)} className="rounded-full border border-white/15 px-3 py-1.5 text-sm hover:border-gold">{r}</button>)}</div>
                </section>
              )}
              <button type="button" onClick={() => go({ key: "fms", href: "/find-my-sign", label: "", group: "" })} className="self-start text-sm underline underline-offset-4 hover:text-gold">Not sure of your sign? Find it from your birth date</button>
            </div>
          )}
          {res && items.length === 0 && (
            <div className="p-4 text-sm">
              <p>Nothing for “{q}”.</p>
              {res.suggestion && <button type="button" onClick={() => type(res.suggestion!)} className="mt-1 text-muted underline underline-offset-4">Did you mean {res.suggestion}?</button>}
            </div>
          )}
          <ul id="search-results" role="listbox" aria-label="Suggestions">
            {items.map((it, i) => (
              <li key={it.key} id={`sr-${i}`} role="option" aria-selected={i === active}>
                {(i === 0 || items[i - 1]!.group !== it.group) && <p className="eyebrow px-3 pb-1 pt-3">{it.group}</p>}
                <button type="button" onMouseEnter={() => setActive(i)} onClick={() => go(it)} className={cx("flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left", i === active && "bg-white/5")}>
                  {it.group === "Fragrances" && (
                    <span className="relative size-11 shrink-0 overflow-hidden rounded-lg bg-white/5">
                      {it.image ? <Image src={it.image} alt="" fill sizes="44px" className="object-cover" /> : null}
                    </span>
                  )}
                  <span className="min-w-0">
                    <span className="block truncate"><Mark text={it.label} q={q.trim()} /></span>
                    {it.sub && <span className="block truncate text-xs text-muted">{it.sub}</span>}
                  </span>
                </button>
              </li>
            ))}
          </ul>
          {res && total > 0 && (
            <button type="button" onClick={() => submit()} className="m-3 text-sm underline underline-offset-4 hover:text-gold">See all results for “{q.trim()}”</button>
          )}
        </div>
      </div>
    </dialog>
  );
}
