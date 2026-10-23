"use client";

import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { newId } from "@/lib/upload-client";
import { APLUS_TYPES, type APlusType } from "@/server/catalog/types";
import type { APlusInput } from "@/schemas/product";
import { btnSecondary, FieldLabel, inputCls } from "../ui";
import { ChipInput, ImageField } from "../widgets";

/** "A+" storytelling blocks shown below the product hero (FlexSell's A+ content, simplified). */
export function APlusEditor({ blocks, onChange, slug }: { blocks: APlusInput[]; onChange: (b: APlusInput[]) => void; slug: string }) {
  const set = (id: string, patch: Partial<APlusInput>) => onChange(blocks.map((b) => (b.id === id ? { ...b, ...patch } : b)));
  const move = (i: number, d: -1 | 1) => {
    const j = i + d;
    if (j < 0 || j >= blocks.length) return;
    const next = [...blocks];
    [next[i], next[j]] = [next[j]!, next[i]!];
    onChange(next);
  };
  const add = (type: APlusType) => onChange([...blocks, { id: newId(), type, title: "", body: "", ...(type === "features" ? { features: [] } : {}), ...(type === "image_text" ? { imageSide: "left" as const } : {}) }]);

  return (
    <div className="flex flex-col gap-4">
      {blocks.length === 0 && <p className="text-sm text-neutral-600">No blocks yet. Add a story, a lifestyle image or a list of highlights; they appear in order below the product.</p>}
      {blocks.map((b, i) => (
        <div key={b.id} className="rounded-lg border border-neutral-200">
          <div className="flex items-center justify-between gap-2 border-b border-neutral-200 bg-neutral-50 px-3 py-2">
            <span className="text-sm font-medium">{i + 1}. {APLUS_TYPES[b.type]}</span>
            <div className="flex items-center gap-1">
              <button type="button" aria-label="Move up" onClick={() => move(i, -1)} disabled={i === 0} className="rounded p-1.5 hover:bg-neutral-200 disabled:opacity-30"><ArrowUp className="size-4" /></button>
              <button type="button" aria-label="Move down" onClick={() => move(i, 1)} disabled={i === blocks.length - 1} className="rounded p-1.5 hover:bg-neutral-200 disabled:opacity-30"><ArrowDown className="size-4" /></button>
              <button type="button" aria-label="Delete block" onClick={() => onChange(blocks.filter((x) => x.id !== b.id))} className="rounded p-1.5 text-neutral-500 hover:bg-red-50 hover:text-red-700"><Trash2 className="size-4" /></button>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 p-3 md:grid-cols-[1fr_260px]">
            <div className="flex flex-col gap-3">
              <FieldLabel label="Heading (optional)"><input className={inputCls} maxLength={120} value={b.title ?? ""} onChange={(e) => set(b.id, { title: e.target.value })} /></FieldLabel>
              {b.type !== "image" && b.type !== "features" && (
                <FieldLabel label="Text" hint={`${(b.body ?? "").length}/2000`}>
                  <textarea rows={4} maxLength={2000} className={`${inputCls} h-auto py-2`} value={b.body ?? ""} onChange={(e) => set(b.id, { body: e.target.value })} />
                </FieldLabel>
              )}
              {b.type === "features" && (
                <FieldLabel label="Highlights" hint="Press Enter after each (up to 12)">
                  <ChipInput value={b.features ?? []} max={12} placeholder="Hand-poured in small batches" onChange={(features) => set(b.id, { features })} />
                </FieldLabel>
              )}
              {b.type === "image_text" && (
                <FieldLabel label="Image side">
                  <select className={inputCls} value={b.imageSide ?? "left"} onChange={(e) => set(b.id, { imageSide: e.target.value as "left" | "right" })}>
                    <option value="left">Image on the left</option>
                    <option value="right">Image on the right</option>
                  </select>
                </FieldLabel>
              )}
            </div>
            {(b.type === "image" || b.type === "image_text") && (
              <ImageField value={b.image} prefix={`products/${slug || "new"}/aplus`} aspect={b.type === "image" ? "aspect-[16/9]" : "aspect-square"} onChange={(image) => set(b.id, { image })} />
            )}
          </div>
        </div>
      ))}
      {blocks.length < 12 && (
        <div className="flex flex-wrap gap-2">
          {(Object.keys(APLUS_TYPES) as APlusType[]).map((t) => (
            <button key={t} type="button" className={btnSecondary} onClick={() => add(t)}>
              <Plus className="size-4" /> {APLUS_TYPES[t]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
