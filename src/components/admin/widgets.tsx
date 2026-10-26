"use client";

import Image from "next/image";
import { useState, useTransition, type KeyboardEvent, type ReactNode } from "react";
import { ImagePlus, Loader2, Trash2, X } from "lucide-react";
import { uploadImage } from "@/lib/upload-client";
import type { FormState } from "@/actions/admin/shared";
import { cn } from "@/lib/cn";
import { btnSecondary, inputCls } from "./ui";
import { ConfirmDialog } from "./kit/Dialog";
import { toast } from "./kit/Toaster";

/** Small interactive admin controls shared by the catalogue screens. */

export function ChipInput({ value, onChange, placeholder, max = 20, lowercase = false, id }: { value: string[]; onChange: (v: string[]) => void; placeholder?: string; max?: number; lowercase?: boolean; id?: string }) {
  const [draft, setDraft] = useState("");
  const add = (raw: string) => {
    const parts = raw
      .split(",")
      .map((s) => (lowercase ? s.trim().toLowerCase() : s.trim()))
      .filter(Boolean);
    const next = [...value];
    for (const p of parts) if (!next.some((x) => x.toLowerCase() === p.toLowerCase()) && next.length < max) next.push(p);
    onChange(next);
    setDraft("");
  };
  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if ((e.key === "Enter" || e.key === ",") && draft.trim()) {
      e.preventDefault();
      add(draft);
    } else if (e.key === "Backspace" && !draft && value.length) onChange(value.slice(0, -1));
  };
  return (
    <div className="flex min-h-10 flex-wrap items-center gap-1.5 rounded-lg border border-neutral-300 bg-white px-2 py-1.5 focus-within:border-neutral-900 focus-within:ring-2 focus-within:ring-neutral-900/10">
      {value.map((v) => (
        <span key={v} className="inline-flex items-center gap-1 rounded-md bg-neutral-100 px-2 py-0.5 text-sm text-neutral-800">
          {v}
          <button type="button" aria-label={`Remove ${v}`} onClick={() => onChange(value.filter((x) => x !== v))} className="text-neutral-500 hover:text-neutral-900">
            <X className="size-3.5" />
          </button>
        </span>
      ))}
      {value.length < max && (
        <input
          id={id}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKey}
          onBlur={() => draft.trim() && add(draft)}
          placeholder={value.length ? "" : placeholder}
          className="h-7 min-w-28 flex-1 border-0 bg-transparent px-1 text-sm outline-none placeholder:text-neutral-400"
        />
      )}
    </div>
  );
}

export type ImageValue = { url: string; alt: string; width: number; height: number };

/** One image: upload, preview, alt text, remove. */
export function ImageField({ value, onChange, prefix, aspect = "aspect-[4/3]", label = "Upload image" }: { value?: ImageValue; onChange: (v: ImageValue | undefined) => void; prefix: string; aspect?: string; label?: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function onFile(file?: File) {
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      const up = await uploadImage(file, prefix);
      onChange({ url: up.url, width: up.width, height: up.height, alt: value?.alt ?? "" });
    } catch (e) {
      setError((e as Error).message || "Upload failed.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="flex flex-col gap-2">
      {value ? (
        <div className={cn("relative overflow-hidden rounded-lg border border-neutral-200 bg-neutral-100", aspect)}>
          <Image src={value.url} alt={value.alt} fill sizes="320px" className="object-cover" />
          <button type="button" onClick={() => onChange(undefined)} aria-label="Remove image" className="absolute right-2 top-2 rounded-md bg-white/90 p-1.5 text-neutral-700 shadow hover:text-red-700">
            <Trash2 className="size-4" />
          </button>
        </div>
      ) : (
        <label className={cn("flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-neutral-300 text-sm text-neutral-600 hover:border-neutral-500", aspect)}>
          {busy ? <Loader2 className="size-5 animate-spin" /> : <ImagePlus className="size-5" />}
          {busy ? "Uploading…" : label}
          <span className="text-xs text-neutral-500">JPG, PNG, WebP · up to 8 MB</span>
          <input type="file" accept="image/jpeg,image/png,image/webp,image/avif" className="sr-only" disabled={busy} onChange={(e) => onFile(e.target.files?.[0])} />
        </label>
      )}
      {value && <input aria-label="Image alt text" placeholder="Describe the image (alt text)" className={`${inputCls} h-9 text-xs`} value={value.alt} onChange={(e) => onChange({ ...value, alt: e.target.value })} />}
      {error && <p className="text-xs text-red-700">{error}</p>}
    </div>
  );
}

/** A button that asks before running a destructive action. */
export function ConfirmButton({
  action,
  children,
  confirm,
  className,
  danger = true,
  onDone,
  detail,
  typeToConfirm,
}: {
  action: () => Promise<FormState>;
  children: ReactNode;
  confirm: string;
  className?: string;
  danger?: boolean;
  onDone?: (s: FormState) => void;
  /** Extra explanation in the dialog (e.g. a money summary). */
  detail?: ReactNode;
  /** Text to type before confirming (e.g. the count for a bulk delete). */
  typeToConfirm?: string;
}) {
  const [asking, setAsking] = useState(false);
  const [pending, start] = useTransition();
  return (
    <>
      <button type="button" onClick={() => setAsking(true)} className={className ?? btnSecondary}>
        {children}
      </button>
      <ConfirmDialog
        open={asking}
        title={confirm}
        danger={danger}
        confirmLabel="Yes, continue"
        typeToConfirm={typeToConfirm}
        pending={pending}
        onCancel={() => setAsking(false)}
        onConfirm={() =>
          start(async () => {
            const res = await action();
            setAsking(false);
            toast.result(res);
            onDone?.(res);
          })
        }
      >
        {detail}
      </ConfirmDialog>
    </>
  );
}

/** Toggle switch with a visible label. */
export function Switch({ checked, onChange, label, hint }: { checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string }) {
  return (
    <label className="flex cursor-pointer items-start gap-3">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn("relative mt-0.5 inline-flex h-5 w-9 shrink-0 rounded-full transition-colors", checked ? "bg-neutral-900" : "bg-neutral-300")}
      >
        <span className={cn("absolute top-0.5 size-4 rounded-full bg-white shadow transition-transform", checked ? "translate-x-4.5" : "translate-x-0.5")} />
      </button>
      <span className="flex flex-col">
        <span className="text-sm font-medium text-neutral-800">{label}</span>
        {hint && <span className="text-xs text-neutral-500">{hint}</span>}
      </span>
    </label>
  );
}
