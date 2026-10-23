"use client";

import { createContext, use, useEffect, useState, type ReactNode } from "react";
import type { Variant } from "@/server/catalog/types";

/**
 * The selected variant, shared by the gallery and the buy box on a product page. Kept in the URL
 * as `?v=SKU` with history.replaceState, so a size can be shared without making the
 * prerendered page dynamic.
 */

interface ProductState {
  variants: Variant[];
  sku: string | undefined;
  select: (sku: string) => void;
}

const Ctx = createContext<ProductState | null>(null);

export function ProductStateProvider({ variants, children }: { variants: Variant[]; children: ReactNode }) {
  const active = variants.filter((v) => v.isActive);
  const fallback = (active.find((v) => v.stock > 0) ?? active[0])?.sku;
  const [sku, setSku] = useState(fallback);

  // Adopt ?v= after hydration (the static HTML always renders the default variant).
  useEffect(() => {
    const wanted = new URLSearchParams(window.location.search).get("v")?.toUpperCase();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (wanted && wanted !== sku && active.some((v) => v.sku === wanted)) setSku(wanted);
    // Run once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const select = (next: string) => {
    setSku(next);
    const url = new URL(window.location.href);
    url.searchParams.set("v", next);
    window.history.replaceState(window.history.state, "", url);
  };

  return <Ctx value={{ variants, sku, select }}>{children}</Ctx>;
}

export function useProductState(): ProductState {
  const v = use(Ctx);
  if (!v) throw new Error("useProductState needs <ProductStateProvider>");
  return v;
}
