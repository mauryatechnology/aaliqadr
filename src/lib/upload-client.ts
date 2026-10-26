"use client";

import { upload } from "@vercel/blob/client";

/** Browser → Vercel Blob uploads through /api/upload (docs/12 §2), with media dimensions. */

export interface Uploaded {
  url: string;
  width: number;
  height: number;
  posterUrl?: string;
}

const safeName = (name: string) => name.toLowerCase().replace(/[^\w.-]+/g, "_").slice(-80);

async function put(pathname: string, file: Blob) {
  return upload(pathname, file, { access: "public", handleUploadUrl: "/api/upload" });
}

export async function uploadImage(file: File, prefix: string, maxMb = 8): Promise<Uploaded> {
  if (!file.type.startsWith("image/")) throw new Error(`${file.name} isn't an image.`);
  if (file.size > maxMb * 1024 * 1024) throw new Error(`${file.name} is over ${maxMb} MB.`);
  const bmp = await createImageBitmap(file);
  const size = { width: bmp.width, height: bmp.height };
  bmp.close();
  const blob = await put(`${prefix}/${safeName(file.name)}`, file);
  return { url: blob.url, ...size };
}

/** Uploads a video plus a poster frame captured at 1 s, so the gallery shows a still. */
export async function uploadVideo(file: File, prefix: string, maxMb = 60): Promise<Uploaded> {
  if (!file.type.startsWith("video/")) throw new Error(`${file.name} isn't a video.`);
  if (file.size > maxMb * 1024 * 1024) throw new Error(`${file.name} is over ${maxMb} MB.`);
  const src = URL.createObjectURL(file);
  try {
    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";
    video.src = src;
    await new Promise<void>((resolve, reject) => {
      video.onloadeddata = () => resolve();
      video.onerror = () => reject(new Error(`${file.name} couldn't be read as a video.`));
    });
    video.currentTime = Math.min(1, (video.duration || 2) / 2);
    await new Promise<void>((resolve) => (video.onseeked = () => resolve()));
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")?.drawImage(video, 0, 0);
    const poster = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
    const [blob, posterBlob] = await Promise.all([
      put(`${prefix}/${safeName(file.name)}`, file),
      poster ? put(`${prefix}/${safeName(file.name)}-poster.jpg`, poster) : Promise.resolve(undefined),
    ]);
    return { url: blob.url, width: video.videoWidth || 1080, height: video.videoHeight || 1350, posterUrl: posterBlob?.url };
  } finally {
    URL.revokeObjectURL(src);
  }
}

export const newId = () => (crypto.randomUUID?.() ?? `${Date.now()}${Math.random()}`).replace(/-/g, "").slice(0, 10);

export interface PreparedImage extends Uploaded {
  hash: string;
  blurDataURL?: string;
}

async function sha256(blob: Blob): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", await blob.arrayBuffer());
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function canvasBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

/**
 * Catalogue photos (plan.md §8.4): refuse small or duplicate images, downscale to at most
 * 2400 px and re-encode as WebP before upload, and make a tiny blur placeholder so the store
 * renders every photo without layout shift.
 */
export async function uploadProductImage(file: File, prefix: string, existingHashes: string[] = [], minLongEdge = 1000): Promise<PreparedImage> {
  if (!file.type.startsWith("image/")) throw new Error(`${file.name} isn't an image.`);
  if (file.size > 20 * 1024 * 1024) throw new Error(`${file.name} is over 20 MB.`);
  const hash = await sha256(file);
  if (existingHashes.includes(hash)) throw new Error(`${file.name} is already in this product's photos.`);
  const bmp = await createImageBitmap(file);
  try {
    const long = Math.max(bmp.width, bmp.height);
    if (long < minLongEdge) throw new Error(`${file.name} is ${bmp.width}×${bmp.height}px. Use a photo at least ${minLongEdge}px on its longest side so it stays sharp when zoomed.`);
    const scale = Math.min(1, 2400 / long);
    const w = Math.round(bmp.width * scale);
    const h = Math.round(bmp.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    canvas.getContext("2d")!.drawImage(bmp, 0, 0, w, h);
    const webp = await canvasBlob(canvas, "image/webp", 0.86);
    const body = webp && webp.type === "image/webp" && webp.size < file.size ? webp : file;
    const name = file.name.replace(/\.[^.]+$/, "") + (body === file ? file.name.slice(file.name.lastIndexOf(".")) : ".webp");

    // 16 px placeholder for blur-up.
    const tiny = document.createElement("canvas");
    tiny.width = 16;
    tiny.height = Math.max(1, Math.round((16 * h) / w));
    tiny.getContext("2d")!.drawImage(bmp, 0, 0, tiny.width, tiny.height);
    const blur = tiny.toDataURL("image/webp", 0.5);

    const blob = await put(`${prefix}/${name.toLowerCase().replace(/[^\w.-]+/g, "_").slice(-80)}`, body);
    return { url: blob.url, width: w, height: h, hash, blurDataURL: blur.startsWith("data:image/webp") && blur.length < 4000 ? blur : undefined };
  } finally {
    bmp.close();
  }
}
