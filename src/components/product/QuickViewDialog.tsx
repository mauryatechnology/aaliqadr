"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Loader2, X } from "lucide-react";
import { quickViewAction } from "@/actions/catalog";
import { routes } from "@/lib/routes";
import type { ProductDTO } from "@/server/catalog/types";
import { ProductStateProvider } from "./ProductState";
import { ProductGallery } from "./ProductGallery";
import { VariantPicker } from "./VariantPicker";

/** Quick view: gallery, sizes, price, stock and Add to bag without leaving the list. */
export function QuickViewDialog({ slug, onClose }: { slug: string; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [p, setP] = useState<ProductDTO | null | undefined>(undefined);
  useEffect(() => {
    ref.current?.showModal();
    let live = true;
    void quickViewAction(slug).then((d) => live && setP(d));
    return () => {
      live = false;
    };
  }, [slug]);
  return (
    <dialog
      ref={ref}
      aria-label={p?.name ?? "Quick view"}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && ref.current?.close()}
      data-zodiac={p?.zodiacSign}
      className="m-0 mt-auto max-h-[92dvh] w-full max-w-full overflow-y-auto rounded-t-2xl border border-white/10 bg-[var(--z-bg)] p-0 text-fg backdrop:bg-black/70 sm:m-auto sm:max-w-4xl sm:rounded-2xl"
    >
      <div className="relative p-4 sm:p-6">
        <button type="button" onClick={() => ref.current?.close()} aria-label="Close" className="absolute right-3 top-3 z-10 rounded-full p-2 hover:bg-white/5"><X className="size-5" /></button>
        {p === undefined && <p className="flex items-center gap-2 p-10 text-muted"><Loader2 className="size-5 animate-spin" /> Loading…</p>}
        {p === null && <p className="p-10 text-muted">This product isn&apos;t available right now.</p>}
        {p && (
          <ProductStateProvider variants={p.variants} syncUrl={false}>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <ProductGallery media={p.media} imageAxis={p.imageAxis} sharedAfterVariant={p.display.sharedAfterVariant} name={p.name} viewTransitionName={`qv-${p.slug}`} fallback={null} />
              <div className="flex flex-col gap-4">
                <h2 className="font-display text-3xl leading-tight">{p.name}</h2>
                {p.tagline && <p className="text-muted">{p.tagline}.</p>}
                <VariantPicker slug={p.slug} name={p.name} options={p.options} media={p.media} imageAxis={p.imageAxis} sharedAfterVariant={p.display.sharedAfterVariant} />
                <Link href={routes.product(p.slug)} className="text-sm underline underline-offset-4 hover:text-gold">View full details</Link>
              </div>
            </div>
          </ProductStateProvider>
        )}
      </div>
    </dialog>
  );
}
