"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { ArrowDown, ArrowUp, Loader2, Plus, Search, Trash2, X } from "lucide-react";
import { deleteCollectionAction, previewRulesAction, saveCollectionAction } from "@/actions/admin/catalog";
import type { FormState } from "@/actions/admin/shared";
import type { CollectionInput } from "@/schemas/product";
import { RULE_FIELDS, RULE_OPS, type RuleField, type RuleOp } from "@/server/catalog/rules";
import { BADGES, TYPE_LABEL } from "@/server/catalog/types";
import { ELEMENTS, SIGNS } from "@/config/zodiac";
import { cn } from "@/lib/cn";
import { routes } from "@/lib/routes";
import { Badge, btnPrimary, btnSecondary, Card, FieldLabel, inputCls, STATUS_TONE } from "../ui";
import { FormStatus } from "../FormStatus";
import { ConfirmButton, ImageField, Switch } from "../widgets";

export interface PickerProduct {
  id: string;
  name: string;
  slug: string;
  status: string;
  image?: string;
  sign?: string;
}

const slugify = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);

/** Suggested values per rule field, so most rules are picked rather than typed. */
function valueChoices(field: RuleField, categories: { slug: string; label: string }[]): { value: string; label: string }[] | null {
  switch (field) {
    case "sign":
      return SIGNS.map((s) => ({ value: s.slug, label: s.name }));
    case "element":
      return ELEMENTS.map((e) => ({ value: e, label: e[0]!.toUpperCase() + e.slice(1) }));
    case "type":
      return Object.entries(TYPE_LABEL).map(([value, label]) => ({ value, label }));
    case "badge":
      return Object.entries(BADGES).map(([value, label]) => ({ value, label }));
    case "category":
      return categories.map((c) => ({ value: c.slug, label: c.label }));
    default:
      return null;
  }
}

const OPS_FOR: Record<RuleField, RuleOp[]> = {
  tag: ["equals", "not_equals", "contains"],
  badge: ["equals", "not_equals"],
  category: ["equals", "not_equals"],
  sign: ["equals", "not_equals"],
  element: ["equals", "not_equals"],
  type: ["equals", "not_equals"],
  price: ["greater_than", "less_than", "equals"],
  stock: ["greater_than", "less_than", "equals"],
  title: ["contains", "equals", "not_equals"],
};

export function CollectionEditor({ initial, products, categories, isNew }: { initial: CollectionInput; products: PickerProduct[]; categories: { slug: string; label: string }[]; isNew: boolean }) {
  const router = useRouter();
  const [c, setC] = useState<CollectionInput>(initial);
  const [state, setState] = useState<FormState>({});
  const [pending, start] = useTransition();
  const [slugTouched, setSlugTouched] = useState(!isNew);
  const [q, setQ] = useState("");
  const [preview, setPreview] = useState<{ products?: { id: string; name: string; status: string }[]; error?: string } | null>(null);
  const set = <K extends keyof CollectionInput>(k: K, v: CollectionInput[K]) => setC((x) => ({ ...x, [k]: v }));
  const byId = new Map(products.map((p) => [p.id, p]));
  const rulesKey = JSON.stringify(c.rules);

  // Live preview of smart rules (debounced).
  useEffect(() => {
    if (c.kind !== "smart") return;
    const t = window.setTimeout(async () => setPreview(await previewRulesAction(JSON.parse(rulesKey))), 350);
    return () => window.clearTimeout(t);
  }, [rulesKey, c.kind]);

  const save = () =>
    start(async () => {
      const res = await saveCollectionAction(c);
      setState(res);
      if (res.ok && isNew && res.id) router.replace(routes.adminCollection(res.id));
      else if (res.ok) router.refresh();
    });

  const moveProduct = (i: number, d: -1 | 1) => {
    const j = i + d;
    if (j < 0 || j >= c.productIds.length) return;
    const ids = [...c.productIds];
    [ids[i], ids[j]] = [ids[j]!, ids[i]!];
    set("productIds", ids);
  };
  const matches = products.filter((p) => !c.productIds.includes(p.id) && (!q || p.name.toLowerCase().includes(q.toLowerCase()) || p.slug.includes(q.toLowerCase()))).slice(0, 30);

  return (
    <div className="flex flex-col gap-6 pb-24">
      <Card title="Basics">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FieldLabel label="Name"><input className={inputCls} value={c.name} maxLength={60} onChange={(e) => setC({ ...c, name: e.target.value, slug: slugTouched ? c.slug : slugify(e.target.value) })} /></FieldLabel>
          <FieldLabel label="URL" hint={`/collections/${c.slug || "…"}`}><input className={`${inputCls} font-mono`} value={c.slug} onChange={(e) => { setSlugTouched(true); set("slug", e.target.value.toLowerCase()); }} /></FieldLabel>
          <FieldLabel label="Description" className="md:col-span-2"><textarea rows={3} maxLength={600} className={`${inputCls} h-auto py-2`} value={c.description} onChange={(e) => set("description", e.target.value)} /></FieldLabel>
          <FieldLabel label="Sort order"><input type="number" min={0} className={inputCls} value={c.sortOrder} onChange={(e) => set("sortOrder", Number(e.target.value) || 0)} /></FieldLabel>
          <div className="flex flex-col gap-3 pt-6">
            <Switch checked={c.isActive} onChange={(v) => set("isActive", v)} label="Visible in store" />
            <Switch checked={c.featured} onChange={(v) => set("featured", v)} label="Featured" hint="Listed first on the Collections page." />
          </div>
        </div>
      </Card>

      <Card title="Products">
        <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {(["manual", "smart"] as const).map((k) => (
            <button key={k} type="button" aria-pressed={c.kind === k} onClick={() => set("kind", k)} className={cn("rounded-xl border p-4 text-left", c.kind === k ? "border-neutral-900 ring-2 ring-neutral-900/10" : "border-neutral-200 hover:border-neutral-400")}>
              <p className="font-medium">{k === "manual" ? "Manual" : "Smart (automatic)"}</p>
              <p className="text-sm text-neutral-600">{k === "manual" ? "Hand-pick products and set their order." : "Products join and leave by rules: sign, tag, price, stock…"}</p>
            </button>
          ))}
        </div>

        {c.kind === "manual" ? (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="flex flex-col gap-2">
              <p className="text-sm font-medium">In this collection ({c.productIds.length})</p>
              {c.productIds.length === 0 && <p className="rounded-lg border border-dashed border-neutral-300 p-4 text-sm text-neutral-600">No products yet. Add them from the list.</p>}
              <ol className="flex flex-col gap-1">
                {c.productIds.map((id, i) => {
                  const p = byId.get(id);
                  return (
                    <li key={id} className="flex items-center gap-2 rounded-lg border border-neutral-200 p-2 text-sm">
                      <span className="w-6 text-center text-xs text-neutral-500">{i + 1}</span>
                      <Thumb p={p} />
                      <span className="min-w-0 flex-1 truncate">{p?.name ?? "Removed product"}</span>
                      {p && p.status !== "active" && <Badge tone={STATUS_TONE[p.status]}>{p.status}</Badge>}
                      <button type="button" aria-label="Move up" onClick={() => moveProduct(i, -1)} className="rounded p-1 hover:bg-neutral-100"><ArrowUp className="size-4" /></button>
                      <button type="button" aria-label="Move down" onClick={() => moveProduct(i, 1)} className="rounded p-1 hover:bg-neutral-100"><ArrowDown className="size-4" /></button>
                      <button type="button" aria-label="Remove" onClick={() => set("productIds", c.productIds.filter((x) => x !== id))} className="rounded p-1 text-neutral-500 hover:bg-red-50 hover:text-red-700"><X className="size-4" /></button>
                    </li>
                  );
                })}
              </ol>
            </div>
            <div className="flex flex-col gap-2">
              <label className="relative">
                <span className="sr-only">Search products</span>
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400" />
                <input className={`${inputCls} pl-9`} placeholder="Search products to add" value={q} onChange={(e) => setQ(e.target.value)} />
              </label>
              <ul className="flex max-h-96 flex-col gap-1 overflow-y-auto">
                {matches.map((p) => (
                  <li key={p.id}>
                    <button type="button" onClick={() => set("productIds", [...c.productIds, p.id])} className="flex w-full items-center gap-2 rounded-lg border border-transparent p-2 text-left text-sm hover:border-neutral-200 hover:bg-neutral-50">
                      <Thumb p={p} />
                      <span className="min-w-0 flex-1 truncate">{p.name}</span>
                      {p.status !== "active" && <Badge tone={STATUS_TONE[p.status]}>{p.status}</Badge>}
                      <Plus className="size-4 text-neutral-500" />
                    </button>
                  </li>
                ))}
                {matches.length === 0 && <li className="p-2 text-sm text-neutral-500">No more products match.</li>}
              </ul>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              Products must match
              <select aria-label="Match" className={`${inputCls} h-9 w-auto`} value={c.rules.match} onChange={(e) => set("rules", { ...c.rules, match: e.target.value as "all" | "any" })}>
                <option value="all">all conditions</option>
                <option value="any">any condition</option>
              </select>
            </div>
            {c.rules.conditions.map((r, i) => {
              const choices = valueChoices(r.field, categories);
              const upd = (patch: Partial<typeof r>) => set("rules", { ...c.rules, conditions: c.rules.conditions.map((x, j) => (j === i ? { ...x, ...patch } : x)) });
              return (
                <div key={i} className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1fr_1.4fr_auto]">
                  <select aria-label="Field" className={inputCls} value={r.field} onChange={(e) => { const field = e.target.value as RuleField; upd({ field, op: OPS_FOR[field][0]!, value: "" }); }}>
                    {(Object.keys(RULE_FIELDS) as RuleField[]).map((f) => <option key={f} value={f}>{RULE_FIELDS[f]}</option>)}
                  </select>
                  <select aria-label="Condition" className={inputCls} value={r.op} onChange={(e) => upd({ op: e.target.value as RuleOp })}>
                    {OPS_FOR[r.field].map((o) => <option key={o} value={o}>{RULE_OPS[o]}</option>)}
                  </select>
                  {choices ? (
                    <select aria-label="Value" className={inputCls} value={r.value} onChange={(e) => upd({ value: e.target.value })}>
                      <option value="">Choose…</option>
                      {choices.map((ch) => <option key={ch.value} value={ch.value}>{ch.label}</option>)}
                    </select>
                  ) : (
                    <input aria-label="Value" className={inputCls} type={r.field === "price" || r.field === "stock" ? "number" : "text"} value={r.value} placeholder={r.field === "price" ? "2000" : r.field === "tag" ? "oud" : ""} onChange={(e) => upd({ value: e.target.value })} />
                  )}
                  <button type="button" aria-label="Remove rule" onClick={() => set("rules", { ...c.rules, conditions: c.rules.conditions.filter((_, j) => j !== i) })} className="rounded p-2 text-neutral-500 hover:bg-red-50 hover:text-red-700"><Trash2 className="size-4" /></button>
                </div>
              );
            })}
            {c.rules.conditions.length < 10 && (
              <button type="button" className={cn(btnSecondary, "self-start")} onClick={() => set("rules", { ...c.rules, conditions: [...c.rules.conditions, { field: "tag", op: "equals", value: "" }] })}><Plus className="size-4" /> Add condition</button>
            )}
            <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3 text-sm">
              {!preview ? (
                <p className="text-neutral-600">Add a condition to see which products match.</p>
              ) : preview.error ? (
                <p className="text-neutral-600">{preview.error}</p>
              ) : (
                <>
                  <p className="mb-2 font-medium">{preview.products!.length} product{preview.products!.length === 1 ? "" : "s"} match right now</p>
                  <ul className="flex flex-wrap gap-1.5">
                    {preview.products!.map((p) => <li key={p.id} className="rounded-md bg-white px-2 py-1 ring-1 ring-neutral-200">{p.name}{p.status !== "active" && <span className="ml-1 text-xs text-neutral-500">({p.status})</span>}</li>)}
                  </ul>
                </>
              )}
            </div>
          </div>
        )}
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card title="Images">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5"><span className="text-sm font-medium">Card image</span><ImageField value={c.image} prefix="catalog/collections" aspect="aspect-[4/5]" onChange={(image) => set("image", image)} /></div>
            <div className="flex flex-col gap-1.5"><span className="text-sm font-medium">Page banner</span><ImageField value={c.banner} prefix="catalog/collections" aspect="aspect-[16/7]" onChange={(banner) => set("banner", banner)} /></div>
          </div>
        </Card>
        <Card title="Search listing">
          <div className="flex flex-col gap-3">
            <FieldLabel label="Page title (optional)" hint={`${c.seoTitle.length}/60`}><input className={inputCls} maxLength={70} value={c.seoTitle} onChange={(e) => set("seoTitle", e.target.value)} /></FieldLabel>
            <FieldLabel label="Meta description (optional)" hint={`${c.seoDescription.length}/155`}><textarea rows={3} maxLength={170} className={`${inputCls} h-auto py-2`} value={c.seoDescription} onChange={(e) => set("seoDescription", e.target.value)} /></FieldLabel>
          </div>
        </Card>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-neutral-200 bg-white/95 px-4 py-3 backdrop-blur lg:left-[262px]">
        <div className="mx-auto flex max-w-[1240px] flex-wrap items-center gap-3">
          <div className="min-w-0 flex-1"><FormStatus state={state} /></div>
          {!isNew && (
            <ConfirmButton confirm="Delete this collection? Products stay in the catalogue." action={() => deleteCollectionAction(c.id!)} onDone={(res) => (res.ok ? router.push("/admin/collections") : setState(res))}>
              Delete
            </ConfirmButton>
          )}
          <button type="button" onClick={save} disabled={pending} className={btnPrimary}>{pending && <Loader2 className="size-4 animate-spin" />} {isNew ? "Create collection" : "Save changes"}</button>
        </div>
      </div>
    </div>
  );
}

function Thumb({ p }: { p?: PickerProduct }) {
  return (
    <span className="relative size-8 shrink-0 overflow-hidden rounded bg-neutral-100">
      {p?.image ? <Image src={p.image} alt="" fill sizes="32px" className="object-cover" /> : <Image src={`/bottles/${p?.sign ?? "brand"}.svg`} alt="" fill sizes="32px" className="object-contain p-0.5" unoptimized />}
    </span>
  );
}
