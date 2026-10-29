"use client";

import { getImageProps } from "next/image";
import { useEffect, useRef, useState } from "react";
import { Check, ShoppingBag } from "lucide-react";
import { cart } from "@/lib/cart-store";
import { formatPrice, pricePerMl } from "@/lib/money";
import { isAvailable, resolveVariant, type ProductOption } from "@/lib/variants";
import { cx as cn } from "@/lib/cx";
import { coverFor } from "@/lib/variant-media";
import type { MediaItem } from "@/server/catalog/types";
import { motion } from "framer-motion";
import { RollingNumberPrice } from "./RollingNumberPrice";
import { triggerFlyToCart } from "@/components/cart/FlyingCartThumbnail";
import { useProductState } from "./ProductState";

/**
 * Option chips (one row per axis), price, stock and Add to bag. Combinations that don't exist
 * or are switched off can't be picked; sold-out ones can be picked and say so. On phones a
 * compact bar sticks to the bottom once the main button scrolls away.
 */
export function VariantPicker({ slug, name, options, media = [], imageAxis, sharedAfterVariant = true }: { slug: string; name: string; options: ProductOption[]; media?: MediaItem[]; imageAxis?: number; sharedAfterVariant?: boolean }) {
  const { variants, sku, select } = useProductState();
  const mediaSource = { media, variants, imageAxis, display: { sharedAfterVariant } };
  const preloaded = useRef(new Set<string>());
  /** Warm the cache for a variant's cover before it's picked (hover/focus), at the gallery's sizes. */
  const preload = (variantSku?: string) => {
    const m = variantSku ? coverFor(mediaSource, variantSku) : undefined;
    if (!m || m.url.endsWith(".svg") || preloaded.current.has(m.url)) return;
    preloaded.current.add(m.url);
    const { props } = getImageProps({ src: m.url, alt: "", width: m.width, height: m.height, sizes: "(min-width: 1024px) 50vw, 100vw", quality: 85 });
    const img = new window.Image();
    if (props.sizes) img.sizes = props.sizes;
    if (props.srcSet) img.srcset = props.srcSet;
    img.src = props.src;
  };
  const active = variants.filter((v) => v.isActive);
  const selected = active.find((v) => v.sku === sku);
  const [added, setAdded] = useState(false);
  const [showBar, setShowBar] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Sync size selection to bottle scale (10ml = 0.93, 50ml = 1.0, 100ml = 1.06)
  useEffect(() => {
    if (!selected) return;
    const vol = selected.volumeMl ?? (selected.label.includes("100") ? 100 : selected.label.includes("10") ? 10 : 50);
    const scale = vol <= 15 ? "0.93" : vol >= 90 ? "1.06" : "1.0";
    document.documentElement.style.setProperty("--bottle-size-scale", scale);
  }, [selected]);

  useEffect(() => {
    const el = buttonRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setShowBar(!e!.isIntersecting && e!.boundingClientRect.top < 0), { threshold: 0 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  if (!selected) return null;
  const soldOut = selected.stock <= 0;

  function add() {
    if (!selected || soldOut) return;
    cart.add({ sku: selected.sku, slug }, 1, selected.maxPerOrder);
    setAdded(true);
    if (buttonRef.current) {
      const cover = coverFor(mediaSource, selected.sku);
      triggerFlyToCart(buttonRef.current, cover?.url);
    }
    window.setTimeout(() => {
      cart.openDrawer();
    }, 800);
    window.setTimeout(() => setAdded(false), 2400);
  }

  // Products without options but with several variants (legacy) pick by label.
  const axes: ProductOption[] = options.length ? options : active.length > 1 ? [{ name: "Size", values: active.map((v) => v.label) }] : [];
  const valuesOf = (v: (typeof active)[number]) => (options.length ? v.optionValues : [v.label]);

  const pick = (axis: number, value: string) => {
    const picked = valuesOf(selected).map((x, i) => (i === axis ? value : x));
    const next = options.length ? resolveVariant(active, picked, axis) : active.find((v) => v.label === value);
    if (next) select(next.sku);
  };

  const cta = soldOut ? "Sold out" : added ? "Added to bag" : "Add to bag";
  const ctaStyle = { background: "var(--z-primary)", color: "var(--z-on-primary)", boxShadow: "0 12px 40px -12px var(--z-glow)" };

  return (
    <div className="flex flex-col gap-6">
      {axes.map((axis, a) => (
        <fieldset key={axis.name}>
          <legend className="eyebrow mb-3">
            {axis.name}: <span className="text-fg normal-case tracking-normal">{valuesOf(selected)[a]}</span>
          </legend>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={axis.name}>
            {axis.values.map((value) => {
              const on = valuesOf(selected)[a] === value;
              const exists = options.length ? isAvailable(active, a, value, []) : true;
              const match = options.length ? resolveVariant(active, valuesOf(selected).map((x, i) => (i === a ? value : x)), a) : active.find((v) => v.label === value);
              const out = !!match && match.stock <= 0 && match.optionValues[a] === value;
              const showMl = a === 0 && match && match.volumeMl > 0 && /ml/i.test(value);
              // Image swatch on the axis that drives photos (e.g. Edition).
              const swatch = imageAxis === a && match ? coverFor(mediaSource, match.sku) : undefined;
              return (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  disabled={!exists}
                  onClick={() => pick(a, value)}
                  onPointerEnter={() => preload(match?.sku)}
                  onFocus={() => preload(match?.sku)}
                  className={cn("relative flex min-w-24 flex-col items-start rounded-xl border px-4 py-3 text-left transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-35", out && !on && "opacity-60")}
                  style={{ borderColor: on ? "var(--z-primary)" : "var(--glass-border)", background: on ? "color-mix(in oklab, var(--z-primary) 14%, transparent)" : "transparent" }}
                >
                  {swatch && !swatch.url.endsWith(".svg") && (
                    // eslint-disable-next-line @next/next/no-img-element -- 28px swatch from the variant's cover; next/image would request an extra size
                    <img src={getImageProps({ src: swatch.url, alt: "", width: 96, height: 96, quality: 60 }).props.src} alt="" width={28} height={28} className="mb-1.5 size-7 rounded-md object-cover" loading="lazy" />
                  )}
                  <span className={cn("text-sm font-medium", out && "line-through decoration-1")}>{value}</span>
                  {showMl ? <span className="text-xs text-muted">{formatPrice(pricePerMl(match.priceP, match.volumeMl))}/ml</span> : out ? <span className="text-xs text-muted">Sold out</span> : null}

                  {/* Sliding gold underline for selected option */}
                  {on && (
                    <motion.span
                      layoutId={`active-option-indicator-${axis.name}`}
                      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                      className="absolute bottom-0 inset-x-2 h-[2px] bg-gold"
                    />
                  )}
                </button>
              );
            })}
          </div>
        </fieldset>
      ))}

      <div className="flex flex-col gap-1.5 pt-1">
        <RollingNumberPrice priceP={selected.priceP} className="font-display text-3xl sm:text-4xl text-ivory font-light" />
        <p className="text-xs text-muted/90 font-light">MRP inclusive of all taxes · {selected.label}</p>
        {soldOut ? (
          <p className="text-xs text-accent">This option is sold out. Choose another, or check back soon.</p>
        ) : selected.stock <= 5 ? (
          <p className="text-xs text-accent">Only {selected.stock} left in vault</p>
        ) : (
          <p className="flex items-center gap-2 text-xs text-ivory/80 pt-0.5">
            <span className="size-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)] animate-pulse" aria-hidden />
            <span>In stock, ships in 1–2 working days</span>
          </p>
        )}
      </div>

      <button
        ref={buttonRef}
        type="button"
        onClick={add}
        disabled={soldOut}
        className="group relative inline-flex h-14 min-h-[52px] sm:min-h-[56px] w-full items-center justify-center gap-3 overflow-hidden rounded-full px-8 font-caps text-xs sm:text-[13px] uppercase tracking-[0.22em] font-semibold transition-all duration-300 ease-ember hover:-translate-y-0.5 active:translate-y-0 active:scale-98 disabled:cursor-not-allowed disabled:opacity-50 shadow-[0_0_24px_rgba(201,169,110,0.25)]"
        style={ctaStyle}
      >
        <span aria-hidden className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
        {added ? (
          <motion.svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            aria-hidden
            className="text-current"
          >
            <motion.path
              d="M3.5 8.5L6.5 11.5L12.5 4.5"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            />
          </motion.svg>
        ) : (
          <ShoppingBag className="size-4" />
        )}
        <span aria-live="polite">{cta}</span>
      </button>

      {/* Sticky bar for phones once the main button has scrolled away (sits above the bottom nav). */}
      <div
        aria-hidden={!showBar}
        className={cn(
          "surface fixed inset-x-3 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-40 flex items-center gap-3 rounded-2xl p-2 pl-4 transition-all duration-300 lg:hidden",
          showBar ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-6 opacity-0",
        )}
      >
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{name}</p>
          <p className="text-xs text-muted">{selected.label} · {formatPrice(selected.priceP)}</p>
        </div>
        <button type="button" tabIndex={showBar ? 0 : -1} onClick={add} disabled={soldOut} className="inline-flex h-11 shrink-0 items-center gap-2 rounded-full px-5 font-caps text-[11px] uppercase tracking-[0.2em] disabled:opacity-50" style={ctaStyle}>
          {added ? <Check className="size-4" /> : <ShoppingBag className="size-4" />} {soldOut ? "Sold out" : added ? "Added" : "Add"}
        </button>
      </div>
    </div>
  );
}
