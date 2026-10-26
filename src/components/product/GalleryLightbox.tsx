"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, X, ZoomIn, ZoomOut } from "lucide-react";
import type { MediaItem } from "@/server/catalog/types";
import { cx as cn } from "@/lib/cx";

export function GalleryLightbox({ items, start, onClose }: { items: MediaItem[]; start: number; onClose: () => void }) {
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
