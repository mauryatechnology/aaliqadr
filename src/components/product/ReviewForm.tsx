"use client";

import Image from "next/image";
import { useState, useTransition } from "react";
import { Camera, Loader2, Star, X } from "lucide-react";
import { submitReviewAction } from "@/actions/engagement";
import { uploadImage } from "@/lib/upload-client";
import { cn } from "@/lib/cn";

/** Write (or edit) a review: stars, title, text and up to four photos. */
export function ReviewForm({ productId, userId, verified }: { productId: string; userId: string; verified: boolean }) {
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [photos, setPhotos] = useState<{ url: string; width: number; height: number }[]>([]);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();

  async function addPhotos(files: FileList | null) {
    if (!files) return;
    setUploading(true);
    try {
      for (const f of Array.from(files).slice(0, 4 - photos.length)) {
        const up = await uploadImage(f, `reviews/${userId}`, 6);
        setPhotos((p) => [...p, up]);
      }
    } catch (e) {
      setResult({ ok: false, text: (e as Error).message || "Upload failed." });
    } finally {
      setUploading(false);
    }
  }

  if (result?.ok) return <p role="status" className="surface p-5 text-sm">{result.text}</p>;
  if (!open)
    return (
      <button type="button" onClick={() => setOpen(true)} className="rounded-full border px-6 py-3 font-caps text-xs uppercase tracking-[0.2em] transition-colors hover:bg-white/5" style={{ borderColor: "var(--z-primary)" }}>
        Write a review
      </button>
    );

  const input = "w-full rounded-xl border border-white/15 bg-transparent px-4 py-3 text-sm text-fg placeholder:text-muted focus:border-[var(--z-primary)] focus:outline-none";
  return (
    <form
      className="surface flex flex-col gap-4 p-5 sm:p-6"
      onSubmit={(e) => {
        e.preventDefault();
        if (!rating) return setResult({ ok: false, text: "Choose a star rating." });
        start(async () => {
          const res = await submitReviewAction({ productId, rating, title, body, photos });
          setResult(res.ok ? { ok: true, text: res.message } : { ok: false, text: res.error });
        });
      }}
    >
      <fieldset>
        <legend className="mb-2 text-sm">Your rating</legend>
        <div className="flex gap-1" role="radiogroup" aria-label="Rating" onMouseLeave={() => setHover(0)}>
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} type="button" role="radio" aria-checked={rating === n} aria-label={`${n} star${n > 1 ? "s" : ""}`} onClick={() => setRating(n)} onMouseEnter={() => setHover(n)} className="p-1">
              <Star className="size-7" style={{ color: "var(--z-primary)" }} fill={n <= (hover || rating) ? "currentColor" : "none"} />
            </button>
          ))}
        </div>
      </fieldset>
      <label className="flex flex-col gap-1.5 text-sm">
        Headline (optional)
        <input className={input} maxLength={80} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Warm, golden, unforgettable" />
      </label>
      <label className="flex flex-col gap-1.5 text-sm">
        Your review
        <textarea className={cn(input, "min-h-32")} maxLength={2000} value={body} onChange={(e) => setBody(e.target.value)} placeholder="How does it open, how long does it last, where do you wear it?" required />
      </label>
      <div className="flex flex-wrap items-center gap-3">
        {photos.map((p, i) => (
          <span key={p.url} className="relative size-16 overflow-hidden rounded-lg">
            <Image src={p.url} alt="" fill sizes="64px" className="object-cover" />
            <button type="button" aria-label="Remove photo" onClick={() => setPhotos(photos.filter((_, j) => j !== i))} className="absolute right-0.5 top-0.5 rounded-full bg-black/60 p-0.5 text-white"><X className="size-3" /></button>
          </span>
        ))}
        {photos.length < 4 && (
          <label className="flex size-16 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-white/25 text-[10px] text-muted hover:border-white/50">
            {uploading ? <Loader2 className="size-4 animate-spin" /> : <Camera className="size-4" />}
            Photo
            <input type="file" accept="image/jpeg,image/png,image/webp" multiple className="sr-only" disabled={uploading} onChange={(e) => addPhotos(e.target.files)} />
          </label>
        )}
      </div>
      <p className="text-xs text-muted">{verified ? "You bought this, so your review will carry a Verified purchase badge." : "Reviews are checked by our team before they appear."}</p>
      {result && !result.ok && <p role="alert" className="text-sm text-red-300">{result.text}</p>}
      <div className="flex gap-3">
        <button type="submit" disabled={pending || uploading} className="inline-flex h-12 items-center gap-2 rounded-full px-7 font-caps text-xs uppercase tracking-[0.2em] disabled:opacity-50" style={{ background: "var(--z-primary)", color: "var(--z-on-primary)" }}>
          {pending && <Loader2 className="size-4 animate-spin" />} Submit review
        </button>
        <button type="button" onClick={() => setOpen(false)} className="px-3 text-sm text-muted hover:text-fg">Cancel</button>
      </div>
    </form>
  );
}
