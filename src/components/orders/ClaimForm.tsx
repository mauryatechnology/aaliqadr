"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Camera, Loader2, Video, X } from "lucide-react";
import { submitReturnAction } from "@/actions/engagement";
import { cn } from "@/lib/cn";

const REASONS = {
  damaged: "Arrived damaged",
  leaked: "Leaked in transit",
  wrong_item: "Wrong item sent",
  missing_item: "Item missing from the parcel",
  other: "Something else",
} as const;

/** Report a damaged / leaked / wrong item with photos and the unboxing video (docs/08 §5). */
export function ClaimForm({ orderId, accessKey, items, userId, until }: { orderId: string; accessKey?: string; items: { sku: string; name: string; qty: number }[]; userId?: string; until?: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState<Record<string, number>>(() => (items.length === 1 ? { [items[0]!.sku]: 1 } : {}));
  const [reason, setReason] = useState<keyof typeof REASONS>("damaged");
  const [description, setDescription] = useState("");
  const [evidence, setEvidence] = useState<{ url: string; kind: "image" | "video"; name: string }[]>([]);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  async function add(files: FileList | null) {
    if (!files || !userId) return;
    setError("");
    try {
      for (const f of Array.from(files).slice(0, 6 - evidence.length)) {
        setBusy(`Uploading ${f.name}…`);
        const { uploadImage, uploadVideo } = await import("@/lib/upload-client");
        const video = f.type.startsWith("video/");
        const up = video ? await uploadVideo(f, `returns/${userId}/${orderId}`) : await uploadImage(f, `returns/${userId}/${orderId}`);
        setEvidence((e) => [...e, { url: up.url, kind: video ? "video" : "image", name: f.name }]);
      }
    } catch (e) {
      setError((e as Error).message || "Upload failed.");
    } finally {
      setBusy("");
    }
  }

  if (!open)
    return (
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={() => setOpen(true)} className="rounded-full border border-white/20 px-5 py-2.5 text-sm hover:border-gold/60">Report a problem</button>
        {until && <span className="text-xs text-muted">Damaged, leaked or wrong item? Tell us by {new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" }).format(new Date(until))}.</span>}
      </div>
    );

  const input = "w-full rounded-xl border border-white/15 bg-transparent px-4 py-3 text-sm text-fg placeholder:text-muted focus:border-gold focus:outline-none";
  return (
    <form
      className="flex flex-col gap-4 rounded-xl border border-white/10 p-4 sm:p-5"
      onSubmit={(e) => {
        e.preventDefault();
        setError("");
        start(async () => {
          const res = await submitReturnAction({
            orderId,
            accessKey,
            items: Object.entries(picked).filter(([, q]) => q > 0).map(([sku, qty]) => ({ sku, qty })),
            reason,
            description,
            evidence: evidence.map(({ url, kind }) => ({ url, kind })),
          });
          if (res.ok) {
            setOpen(false);
            router.refresh();
          } else setError(res.error);
        });
      }}
    >
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-sm">Which item?</legend>
        {items.map((i) => (
          <label key={i.sku} className="flex items-center gap-3 text-sm">
            <input type="checkbox" className="size-4 accent-[var(--color-gold)]" checked={!!picked[i.sku]} onChange={(e) => setPicked({ ...picked, [i.sku]: e.target.checked ? 1 : 0 })} />
            <span className="flex-1">{i.name}</span>
            {i.qty > 1 && picked[i.sku] ? (
              <select aria-label="Quantity affected" value={picked[i.sku]} onChange={(e) => setPicked({ ...picked, [i.sku]: Number(e.target.value) })} className="rounded-lg border border-white/15 bg-transparent px-2 py-1 [&>option]:bg-[var(--z-bg)]">
                {Array.from({ length: i.qty }, (_, n) => <option key={n + 1}>{n + 1}</option>)}
              </select>
            ) : null}
          </label>
        ))}
      </fieldset>
      <label className="flex flex-col gap-1.5 text-sm">
        What happened?
        <select value={reason} onChange={(e) => setReason(e.target.value as keyof typeof REASONS)} className={cn(input, "[&>option]:bg-[var(--z-bg)]")}>
          {Object.entries(REASONS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select>
      </label>
      <label className="flex flex-col gap-1.5 text-sm">
        Details
        <textarea className={cn(input, "min-h-24")} maxLength={1500} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="The cap was cracked and about a third had leaked into the box." required />
      </label>
      <div className="flex flex-col gap-2">
        <p className="text-sm">Photos and the unboxing video</p>
        {userId ? (
          <div className="flex flex-wrap gap-2">
            {evidence.map((e, i) => (
              <span key={e.url} className="flex items-center gap-1.5 rounded-lg bg-white/5 px-2.5 py-1.5 text-xs">
                {e.kind === "video" ? <Video className="size-3.5" /> : <Camera className="size-3.5" />} {e.name.slice(0, 24)}
                <button type="button" aria-label="Remove" onClick={() => setEvidence(evidence.filter((_, j) => j !== i))}><X className="size-3.5" /></button>
              </span>
            ))}
            {evidence.length < 6 && (
              <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-white/25 px-3 py-1.5 text-xs hover:border-white/50">
                {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Camera className="size-3.5" />} {busy || "Add photos / video"}
                <input type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime" multiple className="sr-only" disabled={!!busy} onChange={(e) => add(e.target.files)} />
              </label>
            )}
          </div>
        ) : (
          <p className="text-xs text-muted">Sign in with the email you ordered with to attach photos and video.</p>
        )}
      </div>
      {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
      <div className="flex gap-3">
        <button type="submit" disabled={pending || !!busy} className="inline-flex h-11 items-center gap-2 rounded-full bg-gold px-6 text-xs font-medium uppercase tracking-[0.18em] text-obsidian disabled:opacity-50">
          {pending && <Loader2 className="size-4 animate-spin" />} Send request
        </button>
        <button type="button" onClick={() => setOpen(false)} className="px-3 text-sm text-muted hover:text-fg">Cancel</button>
      </div>
    </form>
  );
}
