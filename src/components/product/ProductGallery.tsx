"use client";

import Image from "next/image";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight, Expand, Play } from "lucide-react";
import type { MediaItem } from "@/server/catalog/types";
import { imagesFor } from "@/lib/variant-media";
import { cx as cn } from "@/lib/cx";
import { useProductState } from "./ProductState";

const GalleryLightbox = dynamic(() => import("./GalleryLightbox").then((m) => m.GalleryLightbox), { ssr: false });

/**
 * Product gallery (docs/09 §6): swipeable CSS scroll-snap slides, thumbnails, keyboard arrows,
 * and a full-screen lightbox with click-to-zoom. No carousel library: scroll-snap does the
 * physics. Shows exactly the selected variant's photos (plan.md §8.6): its own, else its
 * option value's, then shared ones; never another variant's.
 */
export function ProductGallery({
  media,
  name,
  fallback,
  viewTransitionName,
  imageAxis,
  sharedAfterVariant = true,
  sign,
}: {
  media: MediaItem[];
  name: string;
  fallback: ReactNode;
  viewTransitionName: string;
  imageAxis?: number;
  sharedAfterVariant?: boolean;
  sign?: string;
}) {
  const { variants, sku } = useProductState();
  const items = imagesFor({ media, variants, imageAxis, display: { sharedAfterVariant } }, sku);
  const track = useRef<HTMLDivElement>(null);
  const thumbs = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const [lightbox, setLightbox] = useState(false);
  const ownKey = items.map((m) => m.id).join(",");
  const [shownKey, setShownKey] = useState(ownKey);
  // A different set of photos: start again at its first one.
  if (shownKey !== ownKey) {
    setShownKey(ownKey);
    setIndex(0);
  }

  // A new variant with its own photos: show its first one.
  useEffect(() => {
    track.current?.scrollTo({ left: 0, behavior: "smooth" });
  }, [ownKey]);

  // Follow the visible slide (swipe, arrows or thumbnails all end up here).
  useEffect(() => {
    const el = track.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setIndex(Number((e.target as HTMLElement).dataset.index));
      },
      { root: el, threshold: 0.6 },
    );
    el.querySelectorAll("[data-index]").forEach((s) => io.observe(s));
    return () => io.disconnect();
  }, [items.length, ownKey]);

  useEffect(() => {
    thumbs.current?.querySelector<HTMLElement>(`[data-thumb="${index}"]`)?.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" });
  }, [index]);

  const go = (i: number) => {
    const el = track.current;
    if (!el || !items.length) return;
    const n = (i + items.length) % items.length;
    el.scrollTo({ left: n * el.clientWidth, behavior: "smooth" });
  };

  if (!items.length)
    return (
      <div
        className="surface relative grid aspect-[4/5] place-items-center overflow-clip rounded-2xl border border-gold/25 shadow-[0_16px_40px_rgba(0,0,0,0.6)]"
        style={{
          viewTransitionName,
          background: sign
            ? "radial-gradient(80% 70% at 50% 35%, color-mix(in srgb, var(--z-primary) 22%, transparent), var(--z-bg) 85%)"
            : "radial-gradient(80% 70% at 50% 35%, rgba(201,169,110,0.14), #14121A 85%)",
        }}
      >
        {fallback}
      </div>
    );

  return (
    <div className="flex flex-col-reverse gap-3 lg:flex-row">
      {items.length > 1 && (
        <div ref={thumbs} role="tablist" aria-label="Product images" className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] lg:max-h-[min(78vh,760px)] lg:w-20 lg:flex-col lg:overflow-y-auto lg:pb-0">
          {items.map((m, i) => (
            <button
              key={m.id}
              type="button"
              role="tab"
              data-thumb={i}
              aria-selected={i === index}
              aria-label={`Show ${m.kind === "video" ? "video" : `image ${i + 1}`}`}
              onClick={() => go(i)}
              className={cn("relative aspect-square w-16 shrink-0 overflow-hidden rounded-lg ring-1 transition lg:w-full", i === index ? "ring-2 ring-[var(--z-primary)]" : "ring-white/10 opacity-70 hover:opacity-100")}
            >
              <Image
                src={m.kind === "video" ? (m.posterUrl ?? m.url) : m.url}
                alt=""
                fill
                sizes="80px"
                unoptimized={m.url.endsWith(".svg")}
                className={m.url.endsWith(".svg") ? "object-contain p-1.5" : "object-cover"}
              />
              {m.kind === "video" && <span className="absolute inset-0 grid place-items-center bg-black/30"><Play className="size-4 text-white" /></span>}
            </button>
          ))}
        </div>
      )}

      <div className="relative min-w-0 flex-1">
        <div
          key={ownKey}
          ref={track}
          tabIndex={0}
          aria-roledescription="carousel"
          aria-label={`${name} images`}
          onKeyDown={(e) => {
            if (e.key === "ArrowRight") go(index + 1);
            if (e.key === "ArrowLeft") go(index - 1);
          }}
          className="surface flex aspect-[4/5] snap-x snap-mandatory overflow-x-auto overflow-y-clip rounded-2xl border border-gold/25 outline-none [scrollbar-width:none] focus-visible:ring-2 focus-visible:ring-gold [&::-webkit-scrollbar]:hidden shadow-[0_16px_40px_rgba(0,0,0,0.6)] backdrop-blur-md"
          style={{
            viewTransitionName,
            background: sign
              ? "radial-gradient(80% 70% at 50% 35%, color-mix(in srgb, var(--z-primary) 22%, transparent), var(--z-bg) 85%)"
              : "radial-gradient(80% 70% at 50% 35%, rgba(201,169,110,0.14), #14121A 85%)",
            animation: "aq-fade 0.35s ease",
          }}
        >
          {items.map((m, i) => (
            <div key={m.id} data-index={i} className="relative size-full shrink-0 snap-center" aria-roledescription="slide" aria-label={`${i + 1} of ${items.length}`}>
              {m.kind === "video" ? (
                <video src={m.url} poster={m.posterUrl} controls playsInline muted preload="none" className="size-full object-cover" aria-label={m.alt} />
              ) : (
                <button type="button" onClick={() => setLightbox(true)} className="relative block size-full cursor-zoom-in" aria-label={`Enlarge ${m.alt}`}>
                  <Image
                    src={m.url}
                    alt={m.alt}
                    fill
                    quality={85}
                    sizes="(min-width: 1024px) 50vw, 100vw"
                    unoptimized={m.url.endsWith(".svg")}
                    className={m.url.endsWith(".svg") ? "object-contain p-6 sm:p-8 max-h-[580px] drop-shadow-[0_20px_45px_rgba(0,0,0,.75)] transition-transform duration-700 ease-lux" : "object-cover transition-transform duration-700 ease-lux"}
                    style={{
                      transform: "rotate(var(--story-bottle-rotate, 0deg)) scale(var(--bottle-size-scale, 1))",
                    }}
                    preload={i === 0}
                    loading={i === 0 ? "eager" : "lazy"}
                    placeholder={m.blurDataURL && !m.url.endsWith(".svg") ? "blur" : "empty"}
                    blurDataURL={m.blurDataURL}
                  />
                </button>
              )}
            </div>
          ))}
        </div>
        {items.length > 1 && (
          <>
            <button type="button" aria-label="Previous image" onClick={() => go(index - 1)} className="absolute left-3 top-1/2 hidden size-10 -translate-y-1/2 place-items-center rounded-full bg-black/45 text-white backdrop-blur transition hover:bg-black/65 sm:grid"><ChevronLeft className="size-5" /></button>
            <button type="button" aria-label="Next image" onClick={() => go(index + 1)} className="absolute right-3 top-1/2 hidden size-10 -translate-y-1/2 place-items-center rounded-full bg-black/45 text-white backdrop-blur transition hover:bg-black/65 sm:grid"><ChevronRight className="size-5" /></button>
            <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center gap-1.5 sm:hidden" aria-hidden>
              {items.map((m, i) => <span key={m.id} className={cn("h-1.5 rounded-full bg-white/80 transition-all", i === index ? "w-5" : "w-1.5 opacity-50")} />)}
            </div>
          </>
        )}
        {items[index]?.kind === "image" && (
          <button type="button" onClick={() => setLightbox(true)} aria-label="View full screen" className="absolute right-3 top-3 grid size-10 place-items-center rounded-full bg-black/45 text-white backdrop-blur hover:bg-black/65"><Expand className="size-4" /></button>
        )}
      </div>

      {lightbox && <GalleryLightbox items={items.filter((m) => m.kind === "image")} start={Math.max(0, items.filter((m) => m.kind === "image").indexOf(items[index]!))} onClose={() => setLightbox(false)} />}
    </div>
  );
}
