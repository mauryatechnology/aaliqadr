"use client";

import Image from "next/image";
import { useState, type DragEvent } from "react";
import { ArrowLeft, ArrowRight, Copy, ImagePlus, Loader2, Play, Sparkles, Star, Trash2, X } from "lucide-react";
import { newId } from "@/lib/upload-client";
import { cn } from "@/lib/cn";
import type { MediaInput } from "@/schemas/product";
import type { ProductOption } from "@/lib/variants";
import { inputCls } from "../ui";
import { Switch } from "../widgets";
import { imageFirst, makeScopeCover, MAX_PER_PRODUCT, MAX_PER_VARIANT, moveWithinScope, sameScope, useMediaUpload, type Scope } from "./media-utils";

type VariantRef = { sku: string; label: string; optionValues: string[] };

const isSvg = (url: string) => url.endsWith(".svg");

/** One photo/video tile: preview, cover badge, alt text, move/cover/delete, and where it belongs. */
function MediaTile({ m, first, scopes, onChange, onRemove, onMove, onCover }: { m: MediaInput; first: boolean; scopes: { key: string; label: string; scope: Scope }[]; onChange: (patch: Partial<MediaInput>) => void; onRemove: () => void; onMove: (d: -1 | 1) => void; onCover: () => void }) {
  const current = scopes.find((s) => sameScope(s.scope, m.scope))?.key ?? "shared";
  return (
    <li className="flex flex-col gap-1.5 rounded-lg border border-neutral-200 bg-white p-2">
      <div className="relative aspect-[4/5] overflow-hidden rounded-md bg-neutral-900/90">
        {m.kind === "video" ? (
          <>
            {m.posterUrl ? <Image src={m.posterUrl} alt="" fill sizes="200px" className="object-cover" /> : <video src={m.url} muted className="absolute inset-0 size-full object-cover" />}
            <span className="absolute inset-0 grid place-items-center"><span className="grid size-9 place-items-center rounded-full bg-black/60 text-white"><Play className="size-4" /></span></span>
          </>
        ) : (
          <Image src={m.url} alt={m.alt} fill sizes="200px" unoptimized={isSvg(m.url)} placeholder={m.blurDataURL ? "blur" : "empty"} blurDataURL={m.blurDataURL} className={isSvg(m.url) ? "object-contain p-2" : "object-cover"} />
        )}
        {first && m.kind === "image" && <span className="absolute left-1.5 top-1.5 rounded bg-neutral-900 px-1.5 py-0.5 text-[10px] font-medium text-white">Cover</span>}
      </div>
      <input aria-label="Alt text" placeholder="Describe it (alt text)" className={`${inputCls} h-8 text-xs`} value={m.alt} onChange={(e) => onChange({ alt: e.target.value })} />
      <select aria-label="Show this photo for" className={`${inputCls} h-8 text-xs`} value={current} onChange={(e) => onChange({ scope: scopes.find((s) => s.key === e.target.value)!.scope })}>
        {scopes.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
      </select>
      <div className="flex items-center justify-between">
        <div className="flex gap-0.5">
          {!first && m.kind === "image" && (
            <button type="button" onClick={onCover} title="Make cover" className="rounded p-1 text-neutral-600 hover:bg-neutral-100"><Star className="size-3.5" /></button>
          )}
          <button type="button" aria-label="Move earlier" onClick={() => onMove(-1)} className="rounded p-1 text-neutral-600 hover:bg-neutral-100"><ArrowLeft className="size-3.5" /></button>
          <button type="button" aria-label="Move later" onClick={() => onMove(1)} className="rounded p-1 text-neutral-600 hover:bg-neutral-100"><ArrowRight className="size-3.5" /></button>
        </div>
        <button type="button" aria-label="Remove" onClick={onRemove} className="rounded p-1 text-neutral-500 hover:bg-red-50 hover:text-red-700"><Trash2 className="size-3.5" /></button>
      </div>
    </li>
  );
}

/** A titled grid of one scope's items plus its own upload tile (drop files onto it). */
export function MediaGroup({ title, hint, scope, media, all, onChange, upload, busy, scopes, limit, extra }: { title: string; hint?: string; scope: Scope; media: MediaInput[]; all: MediaInput[]; onChange: (next: MediaInput[]) => void; upload: (files: FileList | File[]) => void; busy: string; scopes: { key: string; label: string; scope: Scope }[]; limit: number; extra?: React.ReactNode }) {
  const [over, setOver] = useState(false);
  const items = media.filter((m) => sameScope(m.scope, scope));
  const firstImage = items.find((m) => m.kind === "image")?.id;
  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setOver(false);
    if (e.dataTransfer.files.length) upload(e.dataTransfer.files);
  };
  return (
    <section className={cn("rounded-xl border p-3 transition-colors", over ? "border-neutral-900 bg-neutral-50" : "border-neutral-200")} onDragOver={(e) => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)} onDrop={onDrop} aria-label={title}>
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-sm font-semibold text-neutral-900">{title} <span className="font-normal text-neutral-500">· {items.length}</span></h3>
        {hint && <p className="text-xs text-neutral-500">{hint}</p>}
      </div>
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-6">
        {items.map((m) => (
          <MediaTile
            key={m.id}
            m={m}
            first={m.id === firstImage}
            scopes={scopes}
            onChange={(patch) => onChange(all.map((x) => (x.id === m.id ? { ...x, ...patch } : x)))}
            onRemove={() => onChange(all.filter((x) => x.id !== m.id))}
            onMove={(d) => onChange(moveWithinScope(all, m.id, d))}
            onCover={() => onChange(imageFirst(makeScopeCover(all, m.id)))}
          />
        ))}
        {items.length < limit && all.length < MAX_PER_PRODUCT && (
          <li>
            <label className="flex aspect-[4/5] h-full cursor-pointer flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-neutral-300 p-2 text-center text-xs text-neutral-600 hover:border-neutral-500">
              {busy ? <Loader2 className="size-5 animate-spin" /> : <ImagePlus className="size-5" />}
              {busy || "Add photos"}
              <span className="text-[10px] text-neutral-500">or drop files here</span>
              <input type="file" accept="image/jpeg,image/png,image/webp,image/avif,video/mp4,video/webm" multiple className="sr-only" disabled={!!busy} onChange={(e) => e.target.files && upload(e.target.files)} />
            </label>
          </li>
        )}
      </ul>
      {extra}
    </section>
  );
}

export function scopeChoices(options: ProductOption[], imageAxis: number | undefined, variants: VariantRef[]) {
  return [
    { key: "shared", label: "Every variant (shared)", scope: { kind: "shared" } as Scope },
    ...(imageAxis !== undefined && options[imageAxis]
      ? options[imageAxis]!.values.map((value) => ({ key: `o:${value}`, label: `All "${value}"`, scope: { kind: "option", axis: imageAxis, value } as Scope }))
      : []),
    ...variants.map((v) => ({ key: `v:${v.sku}`, label: `Only ${v.label}`, scope: { kind: "variant", sku: v.sku } as Scope })),
  ];
}

/**
 * Product media (plan.md §8): shared photos, photos per option value (when an image axis is
 * chosen, e.g. Edition) and photos per variant, each with its own cover and order.
 */
export function MediaManager({
  media,
  onChange,
  slug,
  productName,
  zodiacSign,
  options,
  variants,
  imageAxis,
  onImageAxis,
  sharedAfterVariant,
  onSharedAfterVariant,
  onOpenVariant,
}: {
  media: MediaInput[];
  onChange: (next: MediaInput[]) => void;
  slug: string;
  productName: string;
  zodiacSign?: string;
  options: ProductOption[];
  variants: VariantRef[];
  imageAxis?: number;
  onImageAxis: (axis: number | undefined) => void;
  sharedAfterVariant: boolean;
  onSharedAfterVariant: (v: boolean) => void;
  onOpenVariant: (sku: string) => void;
}) {
  const { upload, busy, error } = useMediaUpload({ slug, productName, media, onAdd: (added) => onChange(imageFirst([...media, ...added])) });
  const scopes = scopeChoices(options, imageAxis, variants);
  const hasBottleSvg = media.some((m) => m.url.includes("/bottles/"));
  const multiAxis = options.filter((o) => o.values.length > 1);

  function addDefaultBottle() {
    if (media.length >= MAX_PER_PRODUCT || hasBottleSvg) return;
    onChange(imageFirst([...media, { id: newId(), kind: "image", scope: { kind: "shared" }, url: `/bottles/${zodiacSign || "brand"}.svg`, alt: `${productName || "Product"} signature bottle artwork`, width: 720, height: 1290 }]));
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-3 rounded-lg bg-neutral-50 p-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Photos change with</span>
          <select className={inputCls} value={imageAxis ?? ""} onChange={(e) => onImageAxis(e.target.value === "" ? undefined : Number(e.target.value))}>
            <option value="">Each variant separately</option>
            {multiAxis.map((o) => <option key={o.name} value={options.indexOf(o)}>{o.name} (e.g. all &quot;{o.values[0]}&quot; variants share photos)</option>)}
          </select>
        </label>
        <div className="flex items-end pb-1">
          <Switch checked={sharedAfterVariant} onChange={onSharedAfterVariant} label="Show shared photos after a variant's own" hint="Off: a variant with its own photos shows only those." />
        </div>
      </div>

      <MediaGroup
        title="Shared"
        hint="Shown with every variant (lifestyle, box, notes). The first is the product cover."
        scope={{ kind: "shared" }}
        media={media}
        all={media}
        onChange={onChange}
        upload={(files) => upload(files, { kind: "shared" }, "")}
        busy={busy}
        scopes={scopes}
        limit={MAX_PER_PRODUCT}
        extra={
          !hasBottleSvg && media.length < MAX_PER_PRODUCT ? (
            <button type="button" onClick={addDefaultBottle} className="mt-2 inline-flex items-center gap-1.5 rounded-md border border-neutral-300 bg-white px-2.5 py-1 text-xs font-medium text-neutral-700 hover:border-neutral-900">
              <Sparkles className="size-3.5 text-amber-600" /> Add signature bottle artwork
            </button>
          ) : null
        }
      />

      {imageAxis !== undefined &&
        options[imageAxis]?.values.map((value) => (
          <MediaGroup
            key={value}
            title={`${options[imageAxis]!.name}: ${value}`}
            hint={`Shown for every variant with ${options[imageAxis]!.name} "${value}" unless a variant has its own photos.`}
            scope={{ kind: "option", axis: imageAxis, value }}
            media={media}
            all={media}
            onChange={onChange}
            upload={(files) => upload(files, { kind: "option", axis: imageAxis, value }, value)}
            busy={busy}
            scopes={scopes}
            limit={MAX_PER_VARIANT}
          />
        ))}

      <section className="rounded-xl border border-neutral-200 p-3" aria-label="Photos by variant">
        <h3 className="mb-2 text-sm font-semibold text-neutral-900">By variant</h3>
        <ul className="flex flex-col divide-y divide-neutral-100">
          {variants.map((v) => {
            const own = media.filter((m) => m.scope.kind === "variant" && m.scope.sku === v.sku);
            return (
              <li key={v.sku} className="flex items-center gap-3 py-2">
                <span className="w-40 shrink-0 truncate text-sm">{v.label}</span>
                <span className="flex flex-1 gap-1 overflow-hidden">
                  {own.slice(0, 6).map((m) => (
                    <span key={m.id} className="relative size-9 shrink-0 overflow-hidden rounded bg-neutral-100"><Image src={m.posterUrl ?? m.url} alt="" fill sizes="36px" unoptimized={isSvg(m.url)} className="object-cover" /></span>
                  ))}
                  {own.length === 0 && <span className="text-xs text-neutral-500">No own photos: uses {imageAxis !== undefined ? `"${v.optionValues[imageAxis]}" photos, then ` : ""}shared</span>}
                </span>
                <button type="button" onClick={() => onOpenVariant(v.sku)} className="rounded-lg border border-neutral-300 px-2.5 py-1 text-xs font-medium hover:bg-neutral-50">{own.length ? `Manage ${own.length}` : "Add photos"}</button>
              </li>
            );
          })}
        </ul>
      </section>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      <p className="text-xs text-neutral-500">Photos are resized to 2400 px WebP with a blur placeholder on upload. Use images at least 1000 px on the long side; 4:5 portrait looks best. Up to {MAX_PER_VARIANT} per variant and {MAX_PER_PRODUCT} per product.</p>
    </div>
  );
}

/** Right-side drawer for one variant's photos (opened from the variants table or Media). */
export function VariantMediaPanel({ sku, media, onChange, variants, options, imageAxis, slug, productName, onClose }: { sku: string; media: MediaInput[]; onChange: (next: MediaInput[]) => void; variants: VariantRef[]; options: ProductOption[]; imageAxis?: number; slug: string; productName: string; onClose: () => void }) {
  const v = variants.find((x) => x.sku === sku);
  const { upload, busy, error } = useMediaUpload({ slug, productName, media, onAdd: (added) => onChange(imageFirst([...media, ...added])) });
  const [copyFrom, setCopyFrom] = useState("");
  if (!v) return null;
  const scope: Scope = { kind: "variant", sku };
  const own = media.filter((m) => sameScope(m.scope, scope));
  const axisValue = imageAxis !== undefined ? v.optionValues[imageAxis] : undefined;
  const others = variants.filter((x) => x.sku !== sku && media.some((m) => m.scope.kind === "variant" && m.scope.sku === x.sku));

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label={`Photos for ${v.label}`} onKeyDown={(e) => e.key === "Escape" && onClose()}>
      <button type="button" aria-label="Close" className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="absolute inset-y-0 right-0 flex w-full max-w-2xl flex-col gap-4 overflow-y-auto bg-white p-5 shadow-2xl">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-neutral-500">Variant photos</p>
            <h2 className="text-lg font-semibold">{v.label} <span className="font-mono text-xs font-normal text-neutral-500">{sku}</span></h2>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 hover:bg-neutral-100" aria-label="Close"><X className="size-5" /></button>
        </div>
        <MediaGroup title="This variant" hint="Shown first when a shopper picks this variant." scope={scope} media={media} all={media} onChange={onChange} upload={(files) => upload(files, scope, v.label)} busy={busy} scopes={scopeChoices(options, imageAxis, variants)} limit={MAX_PER_VARIANT} />
        {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
        <div className="flex flex-col gap-2 rounded-lg bg-neutral-50 p-3 text-sm">
          {others.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <Copy className="size-4 text-neutral-500" aria-hidden />
              <select aria-label="Copy photos from" className={`${inputCls} h-9 w-56`} value={copyFrom} onChange={(e) => setCopyFrom(e.target.value)}>
                <option value="">Copy photos from…</option>
                {others.map((o) => <option key={o.sku} value={o.sku}>{o.label}</option>)}
              </select>
              <button
                type="button"
                disabled={!copyFrom}
                className="rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-xs font-medium disabled:opacity-40"
                onClick={() => {
                  const src = media.filter((m) => m.scope.kind === "variant" && m.scope.sku === copyFrom).slice(0, MAX_PER_VARIANT - own.length);
                  onChange([...media, ...src.map((m) => ({ ...m, id: newId(), scope }))]);
                  setCopyFrom("");
                }}
              >
                Copy
              </button>
            </div>
          )}
          {axisValue && own.length > 0 && (
            <button type="button" className="self-start rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-xs font-medium" onClick={() => onChange(media.map((m) => (sameScope(m.scope, scope) ? { ...m, scope: { kind: "option", axis: imageAxis!, value: axisValue } } : m)))}>
              Use these for every &quot;{axisValue}&quot; variant
            </button>
          )}
          {!axisValue && options.filter((o) => o.values.length > 1).length > 1 && <p className="text-xs text-neutral-500">Tip: set &quot;Photos change with&quot; in Media to share photos across sizes of the same edition.</p>}
        </div>
      </div>
    </div>
  );
}
