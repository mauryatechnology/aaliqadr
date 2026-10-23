"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight, Expand, Play, X, ZoomIn, ZoomOut } from "lucide-react";
import type { MediaItem } from "@/server/catalog/types";
import { cn } from "@/lib/cn";
import { useProductState } from "./ProductState";

/**
 * Product gallery (docs/09 §6): swipeable CSS scroll-snap slides, thumbnails, keyboard arrows,
 * and a full-screen lightbox with click-to-zoom. No carousel library: scroll-snap does the
 * physics. The selected variant's own photos move to the front.
 */
export function ProductGallery({ media, name, fallback, viewTransitionName }: { media: MediaItem[]; name: string; fallback: ReactNode; viewTransitionName: string }) {
  const { variants, sku } = useProductState();
  const own = variants.find((v) => v.sku === sku)?.mediaIds ?? [];
  const items = [...own.map((id) => media.find((m) => m.id === id)).filter((m): m is MediaItem => !!m), ...media.filter((m) => !own.includes(m.id))];
  const track = useRef<HTMLDivElement>(null);
  const thumbs = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const [lightbox, setLightbox] = useState(false);
  const ownKey = own.join(",");

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
      <div className="surface relative grid aspect-[4/5] place-items-center overflow-clip" style={{ viewTransitionName, background: "radial-gradient(80% 70% at 50% 35%, var(--z-g2), var(--z-bg) 85%)" }}>
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
          ref={track}
          tabIndex={0}
          aria-roledescription="carousel"
          aria-label={`${name} images`}
          onKeyDown={(e) => {
            if (e.key === "ArrowRight") go(index + 1);
            if (e.key === "ArrowLeft") go(index - 1);
          }}
          className="surface flex aspect-[4/5] snap-x snap-mandatory overflow-x-auto overflow-y-clip rounded-[inherit] outline-none [scrollbar-width:none] focus-visible:ring-2 focus-visible:ring-[var(--z-primary)] [&::-webkit-scrollbar]:hidden"
          style={{ viewTransitionName, background: "radial-gradient(80% 70% at 50% 35%, var(--z-g2), var(--z-bg) 85%)" }}
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
                    className={m.url.endsWith(".svg") ? "object-contain p-6 drop-shadow-[0_15px_30px_rgba(0,0,0,.45)]" : "object-cover"}
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

      {lightbox && <Lightbox items={items.filter((m) => m.kind === "image")} start={Math.max(0, items.filter((m) => m.kind === "image").indexOf(items[index]!))} onClose={() => setLightbox(false)} />}
    </div>
  );
}

function Lightbox({ items, start, onClose }: { items: MediaItem[]; start: number; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [i, setI] = useState(start);
  const [zoom, setZoom] = useState(false);
  const [origin, setOrigin] = useState("50% 50%");
  const m = items[i];

  useEffect(() => {
    const d = ref.current;
    d?.showModal();
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.documentElement.style.overflow = "";
      d?.close();
    };
  }, []);

  const step = (d: number) => {
    setZoom(false);
    setI((x) => (x + d + items.length) % items.length);
  };

  if (!m) return null;
  return (
    <dialog
      ref={ref}
      aria-label="Image viewer"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onKeyDown={(e) => {
        if (e.key === "ArrowRight") step(1);
        if (e.key === "ArrowLeft") step(-1);
      }}
      className="m-0 h-dvh max-h-none w-screen max-w-none bg-black/95 p-0 text-white backdrop:bg-black/80"
    >
      <div className="relative grid size-full place-items-center overflow-hidden">
        <button
          type="button"
          aria-label={zoom ? "Zoom out" : "Zoom in"}
          className={cn("relative size-full", zoom ? "cursor-zoom-out" : "cursor-zoom-in")}
          onClick={(e) => {
            const r = e.currentTarget.getBoundingClientRect();
            setOrigin(`${((e.clientX - r.left) / r.width) * 100}% ${((e.clientY - r.top) / r.height) * 100}%`);
            setZoom((z) => !z);
          }}
          onPointerMove={(e) => {
            if (!zoom || e.pointerType !== "mouse") return;
            const r = e.currentTarget.getBoundingClientRect();
            setOrigin(`${((e.clientX - r.left) / r.width) * 100}% ${((e.clientY - r.top) / r.height) * 100}%`);
          }}
        >
          <Image src={m.url} alt={m.alt} fill quality={85} sizes="100vw" unoptimized={m.url.endsWith(".svg")} className="object-contain transition-transform duration-300" style={{ transform: zoom ? "scale(2.2)" : "scale(1)", transformOrigin: origin }} />
        </button>
        <div className="absolute right-4 top-4 flex gap-2">
          <button type="button" aria-label={zoom ? "Zoom out" : "Zoom in"} onClick={() => setZoom((z) => !z)} className="grid size-11 place-items-center rounded-full bg-white/10 hover:bg-white/20">{zoom ? <ZoomOut className="size-5" /> : <ZoomIn className="size-5" />}</button>
          <button type="button" aria-label="Close" onClick={onClose} className="grid size-11 place-items-center rounded-full bg-white/10 hover:bg-white/20"><X className="size-5" /></button>
        </div>
        {items.length > 1 && (
          <>
            <button type="button" aria-label="Previous image" onClick={() => step(-1)} className="absolute left-4 top-1/2 grid size-12 -translate-y-1/2 place-items-center rounded-full bg-white/10 hover:bg-white/20"><ChevronLeft className="size-6" /></button>
            <button type="button" aria-label="Next image" onClick={() => step(1)} className="absolute right-4 top-1/2 grid size-12 -translate-y-1/2 place-items-center rounded-full bg-white/10 hover:bg-white/20"><ChevronRight className="size-6" /></button>
            <p className="absolute bottom-5 left-1/2 -translate-x-1/2 text-sm text-white/70" aria-live="polite">{i + 1} / {items.length}</p>
          </>
        )}
      </div>
    </dialog>
  );
}
