"use client";

import { useState } from "react";
import { newId, uploadProductImage, uploadVideo } from "@/lib/upload-client";
import type { MediaInput } from "@/schemas/product";

export type Scope = MediaInput["scope"];

export const sameScope = (a: Scope, b: Scope) =>
  a.kind === b.kind && (a.kind !== "variant" || a.sku === (b as { sku: string }).sku) && (a.kind !== "option" || (a.axis === (b as { axis: number }).axis && a.value === (b as { value: string }).value));

export const MAX_PER_VARIANT = 12;
export const MAX_PER_PRODUCT = 40;

/**
 * Uploads files into one scope (shared, a variant, or an option value) with the catalogue
 * pipeline: duplicate check, downscale/WebP, blur placeholder (plan.md §8.4).
 */
export function useMediaUpload({ slug, productName, media, onAdd }: { slug: string; productName: string; media: MediaInput[]; onAdd: (items: MediaInput[]) => void }) {
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  async function upload(files: FileList | File[], scope: Scope, label: string) {
    const room = Math.min(MAX_PER_PRODUCT - media.length, scope.kind === "variant" ? MAX_PER_VARIANT - media.filter((m) => sameScope(m.scope, scope)).length : MAX_PER_PRODUCT);
    const list = Array.from(files).slice(0, Math.max(0, room));
    if (!list.length) return setError(room <= 0 ? "That's the most photos allowed here." : "");
    setError("");
    const added: MediaInput[] = [];
    const hashes = media.map((m) => m.hash).filter((h): h is string => !!h);
    const folder = `products/${slug || "new"}${scope.kind === "variant" ? `/${scope.sku.toLowerCase()}` : ""}`;
    const problems: string[] = [];
    for (const [i, file] of list.entries()) {
      setBusy(`Uploading ${i + 1} of ${list.length}…`);
      try {
        if (file.type.startsWith("video/")) {
          const up = await uploadVideo(file, folder);
          added.push({ id: newId(), kind: "video", scope, url: up.url, posterUrl: up.posterUrl, width: up.width, height: up.height, alt: `${productName || "Product"} ${label} video` });
        } else {
          const up = await uploadProductImage(file, folder, [...hashes, ...added.map((a) => a.hash ?? "")]);
          added.push({ id: newId(), kind: "image", scope, url: up.url, width: up.width, height: up.height, hash: up.hash, ...(up.blurDataURL ? { blurDataURL: up.blurDataURL } : {}), alt: `${productName || "Product"} ${label}`.trim() });
        }
      } catch (e) {
        problems.push((e as Error).message || `${file.name} couldn't be uploaded.`);
      }
    }
    setBusy("");
    if (problems.length) setError(problems.join(" "));
    if (added.length) onAdd(added);
  }

  return { upload, busy, error, setError };
}

/** Keeps an image first overall (the product cover can't be a video). */
export function imageFirst(list: MediaInput[]): MediaInput[] {
  const i = list.findIndex((m) => m.kind === "image");
  if (i <= 0) return list;
  const next = [...list];
  next.unshift(...next.splice(i, 1));
  return next;
}

/** Moves an item one step among the items of its own scope. */
export function moveWithinScope(list: MediaInput[], id: string, dir: -1 | 1): MediaInput[] {
  const item = list.find((m) => m.id === id);
  if (!item) return list;
  const peers = list.map((m, i) => ({ m, i })).filter(({ m }) => sameScope(m.scope, item.scope));
  const at = peers.findIndex(({ m }) => m.id === id);
  const target = peers[at + dir];
  if (!target) return list;
  const next = [...list];
  [next[peers[at]!.i], next[target.i]] = [next[target.i]!, next[peers[at]!.i]!];
  return next;
}

/** Makes an item the first of its scope (the cover for that variant / option / shared set). */
export function makeScopeCover(list: MediaInput[], id: string): MediaInput[] {
  const item = list.find((m) => m.id === id);
  if (!item) return list;
  const firstPeer = list.findIndex((m) => sameScope(m.scope, item.scope));
  const next = list.filter((m) => m.id !== id);
  next.splice(firstPeer, 0, item);
  return next;
}
