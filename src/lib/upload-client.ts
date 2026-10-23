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
