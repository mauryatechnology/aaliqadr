"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { Route } from "next";

/** Sort and in-stock controls for /shop: update the URL, so results stay shareable. */
export function ShopControls({ sorts }: { sorts: { key: string; label: string }[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const set = (k: string, v: string) => {
    const next = new URLSearchParams(sp);
    if (v) next.set(k, v);
    else next.delete(k);
    const q = next.toString();
    router.replace(`${pathname}${q ? `?${q}` : ""}` as Route, { scroll: false });
  };
  return (
    <div className="flex flex-wrap items-center gap-4 text-sm">
      <label className="flex cursor-pointer items-center gap-2">
        <input type="checkbox" className="size-4 accent-[var(--z-primary)]" checked={sp.get("stock") === "in"} onChange={(e) => set("stock", e.target.checked ? "in" : "")} />
        In stock only
      </label>
      <label className="flex items-center gap-2">
        <span className="text-muted">Sort</span>
        <select value={sp.get("sort") ?? ""} onChange={(e) => set("sort", e.target.value)} className="rounded-full border border-white/15 bg-transparent px-3 py-1.5 text-sm text-fg [&>option]:bg-[var(--z-bg)]">
          {sorts.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
        </select>
      </label>
    </div>
  );
}
