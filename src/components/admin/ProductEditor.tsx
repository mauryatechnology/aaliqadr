"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { upload } from "@vercel/blob/client";
import { ArrowDown, ArrowUp, ImagePlus, Loader2, Plus, Trash2 } from "lucide-react";
import { SIGNS } from "@/config/zodiac";
import { saveProductAction } from "@/actions/admin/products";
import type { FormState } from "@/actions/admin/shared";
import type { ProductInput } from "@/schemas/product";
import { routes } from "@/lib/routes";
import { btnPrimary, btnSecondary, Card, FieldLabel, inputCls } from "./ui";
import { FormStatus } from "./FormStatus";

type Tier = "top" | "heart" | "base";
type Variant = ProductInput["variants"][number] & { existing: boolean };
export type EditorValue = Omit<ProductInput, "variants"> & { variants: Variant[] };

const slugify = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export function ProductEditor({ initial, isNew }: { initial: EditorValue; isNew: boolean }) {
  const router = useRouter();
  const [v, setV] = useState<EditorValue>(initial);
  const [state, setState] = useState<FormState>({});
  const [saving, start] = useTransition();
  const [uploading, setUploading] = useState(false);
  const [slugTouched, setSlugTouched] = useState(!isNew);
  const set = <K extends keyof EditorValue>(k: K, val: EditorValue[K]) => setV((x) => ({ ...x, [k]: val }));

  function setVariant(i: number, patch: Partial<Variant>) {
    setV((x) => ({ ...x, variants: x.variants.map((row, j) => (j === i ? { ...row, ...patch } : row)) }));
  }
  function setNote(tier: Tier, i: number, patch: Partial<{ name: string; family: string }>) {
    setV((x) => ({ ...x, notes: { ...x.notes, [tier]: x.notes[tier].map((n, j) => (j === i ? { ...n, ...patch } : n)) } }));
  }
  function moveMedia(i: number, d: -1 | 1) {
    setV((x) => {
      const m = [...x.media];
      const j = i + d;
      if (j < 0 || j >= m.length) return x;
      [m[i], m[j]] = [m[j]!, m[i]!];
      return { ...x, media: m };
    });
  }

  async function onFiles(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    setState({});
    try {
      for (const file of Array.from(files)) {
        if (file.size > 8 * 1024 * 1024) throw new Error(`${file.name} is over 8 MB.`);
        const bmp = await createImageBitmap(file);
        const blob = await upload(`products/${v.slug || "new"}/${file.name.replace(/[^\w.-]/g, "_")}`, file, { access: "public", handleUploadUrl: "/api/upload" });
        setV((x) => ({ ...x, media: [...x.media, { url: blob.url, alt: `${x.name} perfume bottle`, width: bmp.width, height: bmp.height }] }));
        bmp.close();
      }
    } catch (e) {
      setState({ error: (e as Error).message || "Upload failed." });
    } finally {
      setUploading(false);
    }
  }

  function save() {
    setState({});
    start(async () => {
      const { variants, ...rest } = v;
      const res = await saveProductAction({ ...rest, variants: variants.map(({ existing: _e, ...row }) => row) });
      setState(res);
      if (res.ok && isNew && res.id) router.replace(routes.adminProduct(res.id));
      else if (res.ok) router.refresh();
    });
  }

  const num = (s: string) => (s === "" ? 0 : Number(s));

  return (
    <div className="flex flex-col gap-6 pb-24">
      <Card title="Basics">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FieldLabel label="Name">
            <input className={inputCls} value={v.name} onChange={(e) => { const name = e.target.value; setV((x) => ({ ...x, name, slug: slugTouched ? x.slug : slugify(name + (x.zodiacSign ? `-${x.zodiacSign}` : "")) })); }} />
          </FieldLabel>
          <FieldLabel label="URL slug" hint={`/perfume/${v.slug || "…"}`}>
            <input className={`${inputCls} font-mono`} value={v.slug} onChange={(e) => { setSlugTouched(true); set("slug", e.target.value); }} />
          </FieldLabel>
          <FieldLabel label="Type">
            <select className={inputCls} value={v.type} onChange={(e) => set("type", e.target.value as EditorValue["type"])}>
              <option value="fragrance">Signature fragrance</option>
              <option value="bundle">Bundle / discovery</option>
              <option value="gift_set">Gift set</option>
              <option value="body_care">Body care</option>
              <option value="accessory">Accessory</option>
            </select>
          </FieldLabel>
          <FieldLabel label="Status" hint="Only active products are visible in the store.">
            <select className={inputCls} value={v.status} onChange={(e) => set("status", e.target.value as EditorValue["status"])}>
              <option value="draft">Draft (hidden)</option>
              <option value="active">Active (live)</option>
              <option value="archived">Archived</option>
            </select>
          </FieldLabel>
          <FieldLabel label="Zodiac sign" hint="Sets the page theme and element.">
            <select className={inputCls} value={v.zodiacSign ?? ""} onChange={(e) => set("zodiacSign", (e.target.value || undefined) as EditorValue["zodiacSign"])}>
              <option value="">None</option>
              {SIGNS.map((s) => <option key={s.slug} value={s.slug}>{s.name} · {s.rashi}</option>)}
            </select>
          </FieldLabel>
          <FieldLabel label="Concentration">
            <select className={inputCls} value={v.concentration ?? ""} onChange={(e) => set("concentration", (e.target.value || undefined) as EditorValue["concentration"])}>
              <option value="">Not applicable</option>
              <option value="extrait">Extrait de Parfum</option>
              <option value="edp">Eau de Parfum</option>
              <option value="edt">Eau de Toilette</option>
            </select>
          </FieldLabel>
          <FieldLabel label="Tagline" className="md:col-span-2" hint={`${v.tagline.length}/160`}>
            <input className={inputCls} maxLength={160} value={v.tagline} onChange={(e) => set("tagline", e.target.value)} />
          </FieldLabel>
          <FieldLabel label="Intensity (1 soft – 5 commanding)">
            <input type="number" min={1} max={5} className={inputCls} value={v.intensity ?? ""} onChange={(e) => set("intensity", e.target.value ? Math.min(5, Math.max(1, num(e.target.value))) : undefined)} />
          </FieldLabel>
          <FieldLabel label="Sort order" hint="Lower numbers appear first.">
            <input type="number" min={0} className={inputCls} value={v.sortOrder} onChange={(e) => set("sortOrder", num(e.target.value))} />
          </FieldLabel>
        </div>
      </Card>

      <Card title="Story">
        <div className="flex flex-col gap-4">
          <FieldLabel label="Description" hint={`${v.description.length}/4000 · plain text`}>
            <textarea rows={6} maxLength={4000} className={`${inputCls} h-auto py-2`} value={v.description} onChange={(e) => set("description", e.target.value)} />
          </FieldLabel>
          <FieldLabel label="How to wear (optional)">
            <textarea rows={2} maxLength={1000} className={`${inputCls} h-auto py-2`} value={v.howToWear} onChange={(e) => set("howToWear", e.target.value)} />
          </FieldLabel>
        </div>
      </Card>

      <Card title="Notes">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {(["top", "heart", "base"] as const).map((tier) => (
            <div key={tier} className="flex flex-col gap-2">
              <p className="text-sm font-semibold capitalize">{tier} notes</p>
              {v.notes[tier].map((n, i) => (
                <div key={i} className="flex gap-2">
                  <input aria-label={`${tier} note ${i + 1}`} placeholder="Saffron" className={inputCls} value={n.name} onChange={(e) => setNote(tier, i, { name: e.target.value })} />
                  <input aria-label={`${tier} note ${i + 1} family`} placeholder="spicy" className={`${inputCls} w-28`} value={n.family} onChange={(e) => setNote(tier, i, { family: e.target.value })} />
                  <button type="button" aria-label="Remove note" className="text-neutral-500 hover:text-red-700" onClick={() => setV((x) => ({ ...x, notes: { ...x.notes, [tier]: x.notes[tier].filter((_, j) => j !== i) } }))}><Trash2 className="size-4" /></button>
                </div>
              ))}
              {v.notes[tier].length < 8 && (
                <button type="button" className="flex items-center gap-1 self-start text-sm font-medium text-neutral-700 hover:text-neutral-900" onClick={() => setV((x) => ({ ...x, notes: { ...x.notes, [tier]: [...x.notes[tier], { name: "", family: "" }] } }))}>
                  <Plus className="size-4" /> Add note
                </button>
              )}
            </div>
          ))}
        </div>
      </Card>

      <Card title="Photos" actions={<span className="text-xs text-neutral-500">First photo is the main image. Without photos the store shows the sign&apos;s bottle artwork.</span>}>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {v.media.map((m, i) => (
            <div key={m.url} className="flex flex-col gap-2 rounded-lg border border-neutral-200 p-2">
              <div className="relative aspect-[4/5] overflow-hidden rounded-md bg-neutral-100">
                <Image src={m.url} alt={m.alt} fill sizes="200px" className="object-cover" />
              </div>
              <input aria-label="Alt text" className={`${inputCls} h-9 text-xs`} value={m.alt} onChange={(e) => setV((x) => ({ ...x, media: x.media.map((mm, j) => (j === i ? { ...mm, alt: e.target.value } : mm)) }))} />
              <div className="flex justify-between">
                <div className="flex gap-1">
                  <button type="button" aria-label="Move earlier" onClick={() => moveMedia(i, -1)} className="rounded p-1 hover:bg-neutral-100"><ArrowUp className="size-4" /></button>
                  <button type="button" aria-label="Move later" onClick={() => moveMedia(i, 1)} className="rounded p-1 hover:bg-neutral-100"><ArrowDown className="size-4" /></button>
                </div>
                <button type="button" aria-label="Remove photo" onClick={() => setV((x) => ({ ...x, media: x.media.filter((_, j) => j !== i) }))} className="rounded p-1 text-neutral-500 hover:bg-red-50 hover:text-red-700"><Trash2 className="size-4" /></button>
              </div>
            </div>
          ))}
          <label className="flex aspect-[4/5] cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-neutral-300 text-sm text-neutral-600 hover:border-neutral-500">
            {uploading ? <Loader2 className="size-6 animate-spin" /> : <ImagePlus className="size-6" />}
            {uploading ? "Uploading…" : "Add photos"}
            <span className="text-xs text-neutral-500">JPG, PNG, WebP · up to 8 MB</span>
            <input type="file" accept="image/jpeg,image/png,image/webp,image/avif" multiple className="sr-only" disabled={uploading} onChange={(e) => onFiles(e.target.files)} />
          </label>
        </div>
      </Card>

      <Card title="Sizes & prices" actions={<span className="text-xs text-neutral-500">Prices include GST. Stock for existing sizes is changed in Inventory.</span>}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead><tr className="text-xs uppercase tracking-wide text-neutral-500">
              <th className="pb-2 pr-2">SKU</th><th className="pb-2 pr-2">Label</th><th className="pb-2 pr-2">ml</th><th className="pb-2 pr-2">MRP ₹</th><th className="pb-2 pr-2">Price ₹</th><th className="pb-2 pr-2">Weight g</th><th className="pb-2 pr-2">Stock</th><th className="pb-2 pr-2">Low at</th><th className="pb-2 pr-2">Max/order</th><th className="pb-2 pr-2">COD</th><th className="pb-2 pr-2">Active</th><th />
            </tr></thead>
            <tbody>
              {v.variants.map((row, i) => (
                <tr key={i} className="align-top">
                  <td className="py-1 pr-2"><input aria-label="SKU" className={`${inputCls} w-32 font-mono uppercase`} value={row.sku} disabled={row.existing} onChange={(e) => setVariant(i, { sku: e.target.value.toUpperCase() })} /></td>
                  <td className="py-1 pr-2"><input aria-label="Label" className={`${inputCls} w-24`} value={row.label} onChange={(e) => setVariant(i, { label: e.target.value })} /></td>
                  <td className="py-1 pr-2"><input aria-label="Volume ml" type="number" className={`${inputCls} w-20`} value={row.volumeMl} onChange={(e) => setVariant(i, { volumeMl: num(e.target.value) })} /></td>
                  <td className="py-1 pr-2"><input aria-label="MRP" type="number" step="1" className={`${inputCls} w-24`} value={row.mrp} onChange={(e) => setVariant(i, { mrp: num(e.target.value) })} /></td>
                  <td className="py-1 pr-2"><input aria-label="Price" type="number" step="1" aria-invalid={row.price > row.mrp} className={`${inputCls} w-24 aria-[invalid=true]:border-red-500`} value={row.price} onChange={(e) => setVariant(i, { price: num(e.target.value) })} /></td>
                  <td className="py-1 pr-2"><input aria-label="Weight" type="number" className={`${inputCls} w-20`} value={row.weightG} onChange={(e) => setVariant(i, { weightG: num(e.target.value) })} /></td>
                  <td className="py-1 pr-2">{row.existing ? <span className="inline-flex h-10 items-center text-neutral-500">in Inventory</span> : <input aria-label="Initial stock" type="number" min={0} className={`${inputCls} w-20`} value={row.initialStock} onChange={(e) => setVariant(i, { initialStock: num(e.target.value) })} />}</td>
                  <td className="py-1 pr-2"><input aria-label="Low stock threshold" type="number" className={`${inputCls} w-16`} value={row.lowStockThreshold} onChange={(e) => setVariant(i, { lowStockThreshold: num(e.target.value) })} /></td>
                  <td className="py-1 pr-2"><input aria-label="Max per order" type="number" className={`${inputCls} w-16`} value={row.maxPerOrder} onChange={(e) => setVariant(i, { maxPerOrder: num(e.target.value) })} /></td>
                  <td className="py-1 pr-2 pt-3"><input aria-label="COD allowed" type="checkbox" className="size-4" checked={row.codAllowed} onChange={(e) => setVariant(i, { codAllowed: e.target.checked })} /></td>
                  <td className="py-1 pr-2 pt-3"><input aria-label="Active" type="checkbox" className="size-4" checked={row.isActive} onChange={(e) => setVariant(i, { isActive: e.target.checked })} /></td>
                  <td className="py-1 pt-2">{!row.existing && <button type="button" aria-label="Remove size" onClick={() => setV((x) => ({ ...x, variants: x.variants.filter((_, j) => j !== i) }))} className="p-1 text-neutral-500 hover:text-red-700"><Trash2 className="size-4" /></button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button type="button" className={`${btnSecondary} mt-3`} onClick={() => setV((x) => ({ ...x, variants: [...x.variants, { sku: "AQ-", label: "", volumeMl: 50, mrp: 0, price: 0, weightG: 380, lowStockThreshold: 5, maxPerOrder: 5, codAllowed: true, isActive: true, initialStock: 0, existing: false }] }))}>
          <Plus className="size-4" /> Add size
        </button>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card title="Legal & tax">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FieldLabel label="Manufactured by" className="sm:col-span-2"><input className={inputCls} value={v.manufacturer} onChange={(e) => set("manufacturer", e.target.value)} /></FieldLabel>
            <FieldLabel label="Generic name"><input className={inputCls} value={v.genericName} onChange={(e) => set("genericName", e.target.value)} /></FieldLabel>
            <FieldLabel label="Country of origin"><input className={inputCls} value={v.countryOfOrigin} onChange={(e) => set("countryOfOrigin", e.target.value)} /></FieldLabel>
            <FieldLabel label="HSN code"><input className={`${inputCls} font-mono`} value={v.hsnCode} onChange={(e) => set("hsnCode", e.target.value)} /></FieldLabel>
            <FieldLabel label="GST rate %"><input type="number" step="0.01" className={inputCls} value={v.gstRatePercent} onChange={(e) => set("gstRatePercent", num(e.target.value))} /></FieldLabel>
          </div>
        </Card>
        <Card title="Search engine listing">
          <div className="flex flex-col gap-4">
            <FieldLabel label="SEO title (optional)" hint={`${v.seoTitle.length}/60 recommended`}><input className={inputCls} maxLength={70} value={v.seoTitle} onChange={(e) => set("seoTitle", e.target.value)} /></FieldLabel>
            <FieldLabel label="SEO description (optional)" hint={`${v.seoDescription.length}/155 recommended`}><textarea rows={3} maxLength={170} className={`${inputCls} h-auto py-2`} value={v.seoDescription} onChange={(e) => set("seoDescription", e.target.value)} /></FieldLabel>
            <div className="rounded-lg border border-neutral-200 p-3" aria-label="Search preview">
              <p className="truncate text-xs text-emerald-800">aaliqadr.com › perfume › {v.slug}</p>
              <p className="truncate text-base text-blue-800">{v.seoTitle || `${v.name}${v.zodiacSign ? ` · ${v.zodiacSign}` : ""} · Aaliqadr`}</p>
              <p className="line-clamp-2 text-sm text-neutral-600">{v.seoDescription || v.tagline}</p>
            </div>
          </div>
        </Card>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-neutral-200 bg-white/95 px-4 py-3 backdrop-blur lg:left-[262px]">
        <div className="mx-auto flex max-w-[1240px] flex-wrap items-center gap-3">
          <div className="min-w-0 flex-1"><FormStatus state={state} /></div>
          <button type="button" onClick={save} disabled={saving || uploading} className={btnPrimary}>
            {saving && <Loader2 className="size-4 animate-spin" />} {isNew ? "Create product" : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
