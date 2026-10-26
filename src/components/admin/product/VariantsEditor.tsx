"use client";

import Image from "next/image";
import Link from "next/link";
import { Fragment, useState } from "react";
import { AlertTriangle, ArrowDownToLine, ChevronDown, ChevronUp, ImageIcon, Plus, Trash2, Wand2 } from "lucide-react";
import { suggestSku } from "@/lib/sku";
import { combinations, labelFor, MAX_OPTIONS, variantKey, type ProductOption } from "@/lib/variants";
import { cn } from "@/lib/cn";
import type { MediaInput } from "@/schemas/product";
import type { EditorVariant } from "@/server/admin/product-form";
import { btnSecondary, inputCls } from "../ui";
import { ChipInput } from "../widgets";
import { BarcodeScanButton } from "./BarcodeScanButton";

type Defaults = Pick<EditorVariant, "mrp" | "price" | "weightG" | "volumeMl" | "lowStockThreshold" | "maxPerOrder" | "codAllowed">;

const FALLBACK: Defaults = { mrp: 0, price: 0, weightG: 300, volumeMl: 0, lowStockThreshold: 5, maxPerOrder: 5, codAllowed: true };

function blankVariant(values: string[], code: string, d: Defaults, taken: Set<string>): EditorVariant {
  let sku = suggestSku(code, values);
  for (let i = 2; taken.has(sku); i++) sku = `${suggestSku(code, values)}${i}`.slice(0, 40);
  const ml = Number(values.find((v) => /\bml\b/i.test(v))?.match(/\d+/)?.[0] ?? d.volumeMl);
  return { sku, optionValues: values, label: labelFor(values), ...d, volumeMl: ml, dimensionsCm: { l: 0, b: 0, h: 0 }, barcode: "", isActive: true, mediaIds: [], initialStock: 0, existing: false, stock: 0, reserved: 0 };
}

/**
 * Rebuilds the variant list from the options: one row per combination, keeping the rows that
 * already exist. Saved variants whose combination disappeared stay (flagged) until the admin
 * reassigns or deletes them; unsaved ones are dropped.
 */
/** Common option sets, one click to add (plan.md §8.5). */
const TEMPLATES: ProductOption[] = [
  { name: "Size", values: ["10 ml", "50 ml", "100 ml"] },
  { name: "Size", values: ["2 ml", "10 ml"] },
  { name: "Edition", values: ["Classic", "Gift box"] },
  { name: "Pack", values: ["Single", "Pack of 2"] },
];

/** Columns a value can be copied down (from the first row to every row). */
type FillCol = "mrp" | "price" | "cost" | "weightG" | "volumeMl";

/** Enter / Shift+Enter (or Alt+↓ / Alt+↑) moves to the same column in the next / previous row. */
function moveInGrid(e: React.KeyboardEvent<HTMLTableSectionElement>) {
  const el = e.target as HTMLElement;
  const col = el.dataset.col;
  const row = Number(el.closest("tr")?.dataset.row);
  if (!col || Number.isNaN(row)) return;
  const dir = e.key === "Enter" ? (e.shiftKey ? -1 : 1) : e.altKey && e.key === "ArrowDown" ? 1 : e.altKey && e.key === "ArrowUp" ? -1 : 0;
  if (!dir) return;
  const next = e.currentTarget.querySelector<HTMLInputElement>(`tr[data-row="${row + dir}"] [data-col="${col}"]`);
  if (!next) return;
  e.preventDefault();
  next.focus();
  next.select?.();
}

export function syncVariants(options: ProductOption[], variants: EditorVariant[], code: string): EditorVariant[] {
  const usable = options.filter((o) => o.name.trim() && o.values.length);
  const combos = combinations(usable);
  const byKey = new Map(variants.map((v) => [variantKey(v.optionValues), v]));
  const first = variants[0];
  const d: Defaults = first ? { mrp: first.mrp, price: first.price, weightG: first.weightG, volumeMl: first.volumeMl, lowStockThreshold: first.lowStockThreshold, maxPerOrder: first.maxPerOrder, codAllowed: first.codAllowed } : FALLBACK;
  const taken = new Set(variants.map((v) => v.sku));
  const rows = combos.map((values) => {
    const hit = byKey.get(variantKey(values));
    if (hit) return { ...hit, optionValues: values };
    const row = blankVariant(values, code, d, taken);
    taken.add(row.sku);
    return row;
  });
  const keys = new Set(combos.map(variantKey));
  const orphans = variants.filter((v) => v.existing && !keys.has(variantKey(v.optionValues)));
  return [...rows, ...orphans];
}

export function VariantsEditor({
  options,
  variants,
  media,
  orderedSkus,
  code,
  onChange,
  onOpenMedia,
  onDropFiles,
  onSkuRename,
  imageAxis,
  showCost = false,
  gstPercent = 18,
}: {
  options: ProductOption[];
  variants: EditorVariant[];
  media: MediaInput[];
  orderedSkus: string[];
  code: string;
  onChange: (options: ProductOption[], variants: EditorVariant[]) => void;
  /** Opens the variant's photo drawer. */
  onOpenMedia: (sku: string) => void;
  /** Files dropped straight onto a variant row. */
  onDropFiles: (sku: string, files: FileList) => void;
  /** A new variant's SKU was edited: its photos follow it. */
  onSkuRename: (from: string, to: string) => void;
  imageAxis?: number;
  /** Owner only: cost price and margin. */
  showCost?: boolean;
  /** GST rate of the product's HSN, to work out margin on the price before tax. */
  gstPercent?: number;
}) {
  const [open, setOpen] = useState<string | null>(null);
  const [dropOn, setDropOn] = useState<string | null>(null);
  const [fill, setFill] = useState({ mrp: "", price: "", weightG: "", volumeMl: "" });
  const keys = new Set(combinations(options.filter((o) => o.values.length)).map(variantKey));
  const num = (s: string) => (s === "" ? 0 : Number(s));

  const setOptions = (next: ProductOption[]) => onChange(next, syncVariants(next, variants, code));
  const setRow = (i: number, patch: Partial<EditorVariant>) => {
    if (patch.sku !== undefined && variants[i] && patch.sku !== variants[i]!.sku) onSkuRename(variants[i]!.sku, patch.sku);
    onChange(options, variants.map((v, j) => (j === i ? { ...v, ...patch } : v)));
  };
  const removeRow = (i: number) => onChange(options, variants.filter((_, j) => j !== i));
  const fillDown = (col: FillCol) => {
    const first = variants[0];
    if (first) onChange(options, variants.map((v) => ({ ...v, [col]: first[col] })));
  };
  function addTemplate(t: ProductOption) {
    const at = options.findIndex((o) => o.name.toLowerCase() === t.name.toLowerCase());
    if (at >= 0) setOptions(options.map((o, j) => (j === at ? { ...o, values: [...new Set([...o.values, ...t.values])] } : o)));
    else if (options.length < MAX_OPTIONS) setOptions([...options, { ...t, values: [...t.values] }]);
  }
  /** Margin on the price before GST, as a percentage. */
  const margin = (v: EditorVariant) => {
    if (v.cost === undefined || !v.price) return null;
    const net = v.price / (1 + gstPercent / 100);
    return Math.round(((net - v.cost) / net) * 100);
  };
  const colHead = (label: string, col?: FillCol) => (
    <span className="inline-flex items-center gap-1">
      {label}
      {col && variants.length > 1 && (
        <button type="button" onClick={() => fillDown(col)} title={`Copy the first row's ${label.replace(" ₹", "")} to every row`} aria-label={`Fill ${label} down`} className="rounded p-0.5 text-neutral-400 hover:bg-neutral-200 hover:text-neutral-800">
          <ArrowDownToLine className="size-3.5" />
        </button>
      )}
    </span>
  );

  function applyFill() {
    const patch: Partial<EditorVariant> = {};
    if (fill.mrp) patch.mrp = num(fill.mrp);
    if (fill.price) patch.price = num(fill.price);
    if (fill.weightG) patch.weightG = num(fill.weightG);
    if (fill.volumeMl) patch.volumeMl = num(fill.volumeMl);
    onChange(options, variants.map((v) => ({ ...v, ...patch })));
    setFill({ mrp: "", price: "", weightG: "", volumeMl: "" });
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Options */}
      <div className="flex flex-col gap-3">
        {options.map((o, i) => (
          <div key={i} className="grid grid-cols-1 gap-2 rounded-lg border border-neutral-200 bg-neutral-50 p-3 sm:grid-cols-[180px_1fr_auto] sm:items-start">
            <input aria-label={`Option ${i + 1} name`} className={inputCls} placeholder="Size" value={o.name} onChange={(e) => setOptions(options.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} />
            <ChipInput value={o.values} max={12} placeholder={i === 0 ? "10 ml, 50 ml, 100 ml (press Enter after each)" : "Classic, Gift box"} onChange={(values) => setOptions(options.map((x, j) => (j === i ? { ...x, values } : x)))} />
            <button type="button" onClick={() => setOptions(options.filter((_, j) => j !== i))} className="inline-flex h-10 items-center gap-1 rounded-lg px-2 text-sm text-neutral-600 hover:bg-red-50 hover:text-red-700">
              <Trash2 className="size-4" /> Remove
            </button>
          </div>
        ))}
        <div className="flex flex-wrap items-center gap-3">
          {options.length < MAX_OPTIONS && (
            <button type="button" className={btnSecondary} onClick={() => setOptions([...options, { name: options.length ? "Edition" : "Size", values: [] }])}>
              <Plus className="size-4" /> Add option {options.length ? "(e.g. Edition, Pack)" : "(e.g. Size)"}
            </button>
          )}
          <select
            aria-label="Add a common option"
            className={`${inputCls} h-10 w-auto`}
            value=""
            onChange={(e) => {
              const t = TEMPLATES[Number(e.target.value)];
              if (t) addTemplate(t);
            }}
          >
            <option value="">Add from a template…</option>
            {TEMPLATES.map((t, i) => <option key={i} value={i}>{t.name}: {t.values.join(" / ")}</option>)}
          </select>
          <p className="text-xs text-neutral-500">{options.length ? `${variants.length} variant${variants.length === 1 ? "" : "s"}: one per combination.` : "No options: the product is sold as a single variant."}</p>
        </div>
      </div>

      {/* Bulk fill */}
      {variants.length > 1 && (
        <div className="flex flex-wrap items-end gap-2 rounded-lg border border-dashed border-neutral-300 p-3">
          <span className="w-full text-xs font-medium text-neutral-600">Set for every variant</span>
          {(
            [
              ["mrp", "MRP ₹"],
              ["price", "Price ₹"],
              ["weightG", "Weight g"],
              ["volumeMl", "ml"],
            ] as const
          ).map(([k, l]) => (
            <label key={k} className="flex flex-col gap-1 text-xs text-neutral-600">
              {l}
              <input type="number" min={0} className={`${inputCls} w-24`} value={fill[k]} onChange={(e) => setFill({ ...fill, [k]: e.target.value })} />
            </label>
          ))}
          <button type="button" className={btnSecondary} onClick={applyFill} disabled={!Object.values(fill).some(Boolean)}>
            Apply to all
          </button>
        </div>
      )}

      {/* Matrix */}
      <div className="overflow-x-auto rounded-lg border border-neutral-200">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
            <tr>
              <th className="px-3 py-2">Variant</th>
              <th className="px-2 py-2">SKU</th>
              <th className="px-2 py-2">{colHead("MRP ₹", "mrp")}</th>
              <th className="px-2 py-2">{colHead("Price ₹", "price")}</th>
              {showCost && <th className="px-2 py-2">{colHead("Cost ₹", "cost")}</th>}
              <th className="px-2 py-2">Stock</th>
              <th className="px-2 py-2">{colHead("Weight g", "weightG")}</th>
              <th className="px-2 py-2">{colHead("ml", "volumeMl")}</th>
              <th className="px-2 py-2">Images</th>
              <th className="px-2 py-2">Active</th>
              <th className="px-2 py-2" />
            </tr>
          </thead>
          <tbody onKeyDown={moveInGrid}>
            {variants.map((v, i) => {
              const orphan = options.length > 0 && !keys.has(variantKey(v.optionValues));
              const off = v.mrp > 0 && v.price < v.mrp ? Math.round((1 - v.price / v.mrp) * 100) : 0;
              const deletable = !v.existing || (!orderedSkus.includes(v.sku) && v.reserved === 0);
              // The variant's own photos, else what it inherits from its image-axis value.
              const ownMedia = media.filter((m) => m.scope.kind === "variant" && m.scope.sku === v.sku);
              const inherited = imageAxis !== undefined ? media.filter((m) => m.scope.kind === "option" && m.scope.value === v.optionValues[imageAxis]) : [];
              const thumbs = ownMedia.length ? ownMedia : inherited;
              return (
                <Fragment key={`${variantKey(v.optionValues)}#${i}`}>
                  <tr data-row={i} className={cn("border-t border-neutral-100 align-top", orphan && "bg-amber-50", !v.isActive && "opacity-60")}>
                    <td className="px-3 py-2">
                      {orphan ? (
                        <div className="flex flex-col gap-1">
                          <span className="flex items-center gap-1 text-xs font-medium text-amber-800"><AlertTriangle className="size-3.5" /> Not in the options above</span>
                          {options.map((o, axis) => (
                            <select key={axis} aria-label={o.name} className={`${inputCls} h-8 w-36 text-xs`} value={v.optionValues[axis] ?? ""} onChange={(e) => { const vals = [...v.optionValues]; vals[axis] = e.target.value; setRow(i, { optionValues: vals.slice(0, options.length), label: labelFor(vals) }); }}>
                              <option value="">{o.name}…</option>
                              {o.values.map((val) => <option key={val}>{val}</option>)}
                            </select>
                          ))}
                        </div>
                      ) : (
                        <input aria-label="Variant label" data-col="label" className={`${inputCls} w-28`} value={v.label} onChange={(e) => setRow(i, { label: e.target.value })} />
                      )}
                    </td>
                    <td className="px-2 py-2">
                      <input aria-label="SKU" data-col="sku" className={`${inputCls} w-36 font-mono text-xs uppercase`} value={v.sku} disabled={v.existing} title={v.existing ? "SKUs can't change once saved (orders and stock refer to them)" : undefined} onChange={(e) => setRow(i, { sku: e.target.value.toUpperCase() })} />
                      {!v.existing && (
                        <button type="button" className="mt-1 inline-flex items-center gap-1 text-[11px] text-neutral-500 hover:text-neutral-900" onClick={() => setRow(i, { sku: suggestSku(code, v.optionValues) })}>
                          <Wand2 className="size-3" /> Auto
                        </button>
                      )}
                    </td>
                    <td className="px-2 py-2"><input aria-label="MRP" data-col="mrp" type="number" min={0} className={`${inputCls} w-24`} value={v.mrp} onChange={(e) => setRow(i, { mrp: num(e.target.value) })} /></td>
                    <td className="px-2 py-2">
                      <input aria-label="Price" data-col="price" type="number" min={0} aria-invalid={v.price > v.mrp} className={`${inputCls} w-24 aria-[invalid=true]:border-red-500`} value={v.price} onChange={(e) => setRow(i, { price: num(e.target.value) })} />
                      <span className={cn("mt-1 block text-[11px]", v.price > v.mrp ? "text-red-700" : "text-neutral-500")}>{v.price > v.mrp ? "Above MRP" : off ? `${off}% off` : "No discount"}</span>
                    </td>
                    {showCost && (
                      <td className="px-2 py-2">
                        <input aria-label="Cost price" data-col="cost" type="number" min={0} className={`${inputCls} w-24`} value={v.cost ?? ""} placeholder="—" onChange={(e) => setRow(i, { cost: e.target.value === "" ? undefined : num(e.target.value) })} />
                        {margin(v) !== null && <span className={cn("mt-1 block text-[11px]", margin(v)! < 0 ? "text-red-700" : "text-neutral-500")} title="Margin on the price before GST">{margin(v)}% margin</span>}
                      </td>
                    )}
                    <td className="px-2 py-2">
                      {v.existing ? (
                        <Link href="/admin/inventory" className="inline-flex h-10 items-center text-sm tabular-nums underline-offset-4 hover:underline" title="Change stock in Inventory (every change is recorded)">
                          {v.stock}{v.reserved ? <span className="ml-1 text-xs text-neutral-500">(+{v.reserved} held)</span> : null}
                        </Link>
                      ) : (
                        <input aria-label="Opening stock" data-col="stock" type="number" min={0} className={`${inputCls} w-20`} value={v.initialStock} onChange={(e) => setRow(i, { initialStock: num(e.target.value) })} />
                      )}
                    </td>
                    <td className="px-2 py-2"><input aria-label="Weight in grams" data-col="weightG" type="number" min={1} className={`${inputCls} w-20`} value={v.weightG} onChange={(e) => setRow(i, { weightG: num(e.target.value) })} /></td>
                    <td className="px-2 py-2"><input aria-label="Volume in ml" data-col="volumeMl" type="number" min={0} className={`${inputCls} w-20`} value={v.volumeMl} onChange={(e) => setRow(i, { volumeMl: num(e.target.value) })} /></td>
                    <td
                      className={cn("px-2 py-2", dropOn === v.sku && "bg-neutral-100")}
                      onDragOver={(e) => {
                        if (!e.dataTransfer.types.includes("Files")) return;
                        e.preventDefault();
                        setDropOn(v.sku);
                      }}
                      onDragLeave={() => setDropOn(null)}
                      onDrop={(e) => {
                        e.preventDefault();
                        setDropOn(null);
                        if (e.dataTransfer.files.length) onDropFiles(v.sku, e.dataTransfer.files);
                      }}
                    >
                      <button type="button" onClick={() => onOpenMedia(v.sku)} title="Add or manage this variant's photos (or drop files here)" className={cn("flex h-10 min-w-20 items-center gap-1 rounded-lg border px-2 text-xs hover:bg-neutral-50", ownMedia.length ? "border-neutral-300" : "border-dashed border-neutral-300")}>
                        {thumbs.length ? (
                          thumbs.slice(0, 3).map((m) => <span key={m.id} className={cn("relative size-6 overflow-hidden rounded", !ownMedia.length && "opacity-60")}><Image src={m.posterUrl ?? m.url} alt="" fill sizes="24px" unoptimized={m.url.endsWith(".svg")} className="object-cover" /></span>)
                        ) : (
                          <ImageIcon className="size-4 text-neutral-500" />
                        )}
                        <span className="text-neutral-600">{ownMedia.length ? ownMedia.length : thumbs.length ? "inherits" : "Add"}</span>
                      </button>
                    </td>
                    <td className="px-2 py-2 pt-4"><input aria-label="Active" type="checkbox" className="size-4" checked={v.isActive} onChange={(e) => setRow(i, { isActive: e.target.checked })} /></td>
                    <td className="px-2 py-2">
                      <div className="flex items-center gap-1">
                        <button type="button" aria-label="More settings" aria-expanded={open === v.sku} onClick={() => setOpen(open === v.sku ? null : v.sku)} className="rounded p-2 text-neutral-600 hover:bg-neutral-100">
                          {open === v.sku ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
                        </button>
                        {(orphan || options.length === 0) && deletable && variants.length > 1 && (
                          <button type="button" aria-label="Delete variant" onClick={() => removeRow(i)} className="rounded p-2 text-neutral-500 hover:bg-red-50 hover:text-red-700"><Trash2 className="size-4" /></button>
                        )}
                      </div>
                    </td>
                  </tr>
                  {open === v.sku && (
                    <tr className="bg-neutral-50">
                      <td colSpan={showCost ? 11 : 10} className="px-3 py-3">
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
                          <label className="flex flex-col gap-1 text-xs text-neutral-600">
                            Barcode (EAN/UPC)
                            <span className="flex gap-1">
                              <input className={`${inputCls} min-w-0 font-mono`} value={v.barcode} onChange={(e) => setRow(i, { barcode: e.target.value })} />
                              <BarcodeScanButton onScan={(code) => setRow(i, { barcode: code })} />
                            </span>
                          </label>
                          {(["l", "b", "h"] as const).map((k) => (
                            <label key={k} className="flex flex-col gap-1 text-xs text-neutral-600">
                              {k === "l" ? "Length cm" : k === "b" ? "Breadth cm" : "Height cm"}
                              <input type="number" min={0} className={inputCls} value={v.dimensionsCm[k]} onChange={(e) => setRow(i, { dimensionsCm: { ...v.dimensionsCm, [k]: num(e.target.value) } })} />
                            </label>
                          ))}
                          <label className="flex flex-col gap-1 text-xs text-neutral-600">Low-stock alert at<input type="number" min={0} className={inputCls} value={v.lowStockThreshold} onChange={(e) => setRow(i, { lowStockThreshold: num(e.target.value) })} /></label>
                          <label className="flex flex-col gap-1 text-xs text-neutral-600">Max per order<input type="number" min={1} className={inputCls} value={v.maxPerOrder} onChange={(e) => setRow(i, { maxPerOrder: num(e.target.value) })} /></label>
                          <label className="flex items-center gap-2 pt-5 text-sm"><input type="checkbox" className="size-4" checked={v.codAllowed} onChange={(e) => setRow(i, { codAllowed: e.target.checked })} /> Cash on delivery</label>
                        </div>
                        {v.existing && !deletable && <p className="mt-2 text-xs text-neutral-500">This variant appears in orders, so it can be switched off but not deleted.</p>}
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-neutral-500">Enter / Shift+Enter moves down / up a column. Prices include GST{showCost ? "; margin is worked out on the price before GST" : ""}. Stock of saved variants changes in Inventory, where every change is recorded. Weight and dimensions are the packed parcel, used for shipping.</p>
    </div>
  );
}
