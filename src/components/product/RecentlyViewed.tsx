"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { formatPrice } from "@/lib/money";
import { routes } from "@/lib/routes";

/**
 * Products this visitor looked at recently, kept only in their browser (no tracking, no
 * server state). Records the current product and lists the others.
 */

interface Seen {
  slug: string;
  name: string;
  image?: string;
  sign?: string;
  priceP: number;
}

const KEY = "aq-recent-v1";

function read(): Seen[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]") as Seen[];
  } catch {
    return [];
  }
}

export function RecentlyViewed({ current }: { current: Seen }) {
  const [items, setItems] = useState<Seen[]>([]);

  useEffect(() => {
    const prev = read().filter((x) => x.slug !== current.slug);
    try {
      localStorage.setItem(KEY, JSON.stringify([current, ...prev].slice(0, 12)));
    } catch {
      // Private mode or full storage: the strip just stays empty.
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setItems(prev.slice(0, 6));
  }, [current]);

  if (!items.length) return null;
  return (
    <section aria-labelledby="recently-viewed" className="mx-auto max-w-[1360px] px-4 pb-20 sm:px-6">
      <h2 id="recently-viewed" className="eyebrow mb-5">Recently viewed</h2>
      <ul className="flex gap-4 overflow-x-auto pb-2 [scrollbar-width:thin]">
        {items.map((p) => (
          <li key={p.slug} className="w-40 shrink-0">
            <Link href={routes.product(p.slug)} data-zodiac={p.sign} className="group flex flex-col gap-2">
              <span className="surface relative block aspect-[4/5] overflow-clip" style={{ background: "radial-gradient(80% 70% at 50% 35%, var(--z-g2), var(--z-bg) 85%)" }}>
                {p.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.image} alt="" className="absolute inset-0 size-full object-cover" loading="lazy" />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={`/bottles/${p.sign ?? "brand"}.svg`} alt="" className="absolute inset-0 size-full object-contain p-5" loading="lazy" />
                )}
              </span>
              <span className="truncate text-sm group-hover:text-accent">{p.name}</span>
              <span className="text-muted text-xs">{formatPrice(p.priceP)}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
