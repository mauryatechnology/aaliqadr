"use client";

import Image from "next/image";
import { useState, type DragEvent } from "react";
import { GripVertical, ImagePlus, Loader2, Play, Sparkles, Star, Trash2 } from "lucide-react";
import { newId, uploadImage, uploadVideo } from "@/lib/upload-client";
import { cn } from "@/lib/cn";
import type { MediaInput } from "@/schemas/product";
import { inputCls } from "../ui";

/**
 * Product gallery: upload images and videos, drag to reorder, set the cover, write alt text.
 * The first item is the cover (card image, social preview) and must be an image.
 */
export function MediaManager({
  media,
  onChange,
  slug,
  productName,
  usage,
  zodiacSign,
}: {
  media: MediaInput[];
  onChange: (next: MediaInput[]) => void;
  slug: string;
  productName: string;
  /** media id → variant labels that show it first */
  usage: Map<string, string[]>;
  zodiacSign?: string;
}) {
  const [busy, setBusy] = useState<string>("");
  const [error, setError] = useState("");
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  const hasBottleSvg = media.some((m) => m.url.includes("/bottles/"));
  const defaultBottleUrl = `/bottles/${zodiacSign || "brand"}.svg`;

  function addDefaultBottle() {
    if (media.length >= 20 || hasBottleSvg) return;
    onChange([
      ...media,
      {
        id: `bottle-${zodiacSign || "brand"}-${Date.now()}`,
        kind: "image",
        url: defaultBottleUrl,
        alt: `${productName || "Product"} signature bottle artwork`,
        width: 720,
        height: 1290,
      },
    ]);
  }

  async function addFiles(files: FileList | File[]) {
    const list = Array.from(files).slice(0, 20 - media.length);
    if (!list.length) return;
    setError("");
    const added: MediaInput[] = [];
    try {
      for (const [i, file] of list.entries()) {
        setBusy(`Uploading ${i + 1} of ${list.length}…`);
        const prefix = `products/${slug || "new"}`;
        if (file.type.startsWith("video/")) {
          const up = await uploadVideo(file, prefix);
          added.push({ id: newId(), kind: "video", url: up.url, posterUrl: up.posterUrl, width: up.width, height: up.height, alt: `${productName || "Product"} video` });
        } else {
          const up = await uploadImage(file, prefix);
          added.push({ id: newId(), kind: "image", url: up.url, width: up.width, height: up.height, alt: `${productName || "Product"}${media.length + added.length ? ` view ${media.length + added.length + 1}` : ""}` });
        }
      }
    } catch (e) {
      setError((e as Error).message || "Upload failed.");
    } finally {
      setBusy("");
      if (added.length) {
        // Keep an image in front: a video can't be the cover.
        const next = [...media, ...added];
        const firstImage = next.findIndex((m) => m.kind === "image");
        if (firstImage > 0) next.unshift(...next.splice(firstImage, 1));
        onChange(next);
      }
    }
  }

  function move(from: number, to: number) {
    if (from === to || to < 0 || to >= media.length) return;
    const next = [...media];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item!);
    if (next[0]?.kind !== "image") return setError("The cover must be an image. Move a video to a later position.");
    setError("");
    onChange(next);
  }

  const onDrop = (e: DragEvent, i: number) => {
    e.preventDefault();
    if (dragIndex !== null) move(dragIndex, i);
    else if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
    setDragIndex(null);
    setOverIndex(null);
  };

  return (
    <div className="flex flex-col gap-3">
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
        {media.map((m, i) => (
          <li
            key={m.id}
            draggable
            onDragStart={() => setDragIndex(i)}
            onDragEnd={() => {
              setDragIndex(null);
              setOverIndex(null);
            }}
            onDragOver={(e) => {
              e.preventDefault();
              setOverIndex(i);
            }}
            onDrop={(e) => onDrop(e, i)}
            className={cn("flex flex-col gap-2 rounded-lg border bg-white p-2 transition-shadow", overIndex === i && dragIndex !== null && dragIndex !== i ? "border-neutral-900 ring-2 ring-neutral-900/20" : "border-neutral-200", dragIndex === i && "opacity-50")}
          >
            <div className="relative aspect-[4/5] overflow-hidden rounded-md bg-neutral-900/90">
              {m.kind === "video" ? (
                <>
                  {m.posterUrl ? <Image src={m.posterUrl} alt="" fill sizes="220px" className="object-cover" /> : <video src={m.url} muted className="absolute inset-0 size-full object-cover" />}
                  <span className="absolute inset-0 grid place-items-center"><span className="grid size-10 place-items-center rounded-full bg-black/60 text-white"><Play className="size-5" /></span></span>
                </>
              ) : (
                <Image
                  src={m.url}
                  alt={m.alt}
                  fill
                  sizes="220px"
                  unoptimized={m.url.endsWith(".svg")}
                  className={m.url.endsWith(".svg") ? "object-contain p-2 drop-shadow-[0_8px_16px_rgba(0,0,0,0.6)]" : "object-cover"}
                />
              )}
              {i === 0 && <span className="absolute left-2 top-2 rounded bg-neutral-900 px-1.5 py-0.5 text-[11px] font-medium text-white">Cover</span>}
              <span className="absolute right-2 top-2 cursor-grab rounded bg-white/90 p-1 text-neutral-600 shadow active:cursor-grabbing" title="Drag to reorder"><GripVertical className="size-4" /></span>
            </div>
            <input aria-label={`Alt text for item ${i + 1}`} placeholder="Describe it (alt text)" className={`${inputCls} h-9 text-xs`} value={m.alt} onChange={(e) => onChange(media.map((x) => (x.id === m.id ? { ...x, alt: e.target.value } : x)))} />
            {usage.get(m.id)?.length ? <p className="truncate text-[11px] text-neutral-500">Shown first for {usage.get(m.id)!.join(", ")}</p> : null}
            <div className="flex items-center justify-between">
              <div className="flex gap-1">
                {i > 0 && m.kind === "image" && (
                  <button type="button" onClick={() => move(i, 0)} className="inline-flex items-center gap-1 rounded px-1.5 py-1 text-xs text-neutral-700 hover:bg-neutral-100" title="Make this the cover">
                    <Star className="size-3.5" /> Cover
                  </button>
                )}
                <button type="button" aria-label="Move earlier" onClick={() => move(i, i - 1)} disabled={i === 0} className="rounded px-1.5 py-1 text-xs text-neutral-700 hover:bg-neutral-100 disabled:opacity-30">←</button>
                <button type="button" aria-label="Move later" onClick={() => move(i, i + 1)} disabled={i === media.length - 1} className="rounded px-1.5 py-1 text-xs text-neutral-700 hover:bg-neutral-100 disabled:opacity-30">→</button>
              </div>
              <button type="button" aria-label="Remove" onClick={() => onChange(media.filter((x) => x.id !== m.id))} className="rounded p-1 text-neutral-500 hover:bg-red-50 hover:text-red-700">
                <Trash2 className="size-4" />
              </button>
            </div>
          </li>
        ))}
        {media.length < 20 && (
          <li>
            <label
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
              }}
              className="flex aspect-[4/5] h-full cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-neutral-300 p-3 text-center text-sm text-neutral-600 hover:border-neutral-500"
            >
              {busy ? <Loader2 className="size-6 animate-spin" /> : <ImagePlus className="size-6" />}
              {busy || "Add photos or video"}
              <span className="text-xs text-neutral-500">Drop files here · images up to 8 MB, MP4/WebM up to 60 MB</span>
              <input type="file" accept="image/jpeg,image/png,image/webp,image/avif,video/mp4,video/webm" multiple className="sr-only" disabled={!!busy} onChange={(e) => e.target.files && addFiles(e.target.files)} />
            </label>
          </li>
        )}
      </ul>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
        <p className="text-xs text-neutral-500">
          Drag to reorder. The cover appears on cards and social previews. Multiple images form the swipeable gallery on the product page.
        </p>
        {!hasBottleSvg && media.length < 20 && (
          <button
            type="button"
            onClick={addDefaultBottle}
            className="inline-flex items-center gap-1.5 rounded-md border border-neutral-300 bg-neutral-50 px-2.5 py-1 text-xs font-medium text-neutral-700 shadow-sm hover:border-neutral-900 hover:bg-white"
          >
            <Sparkles className="size-3.5 text-amber-600" /> Add signature bottle artwork
          </button>
        )}
      </div>
    </div>
  );
}
