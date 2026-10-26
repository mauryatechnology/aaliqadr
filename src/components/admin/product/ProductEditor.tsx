"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Copy, Eye, ExternalLink, FileClock, Loader2, Plus, Trash2 } from "lucide-react";
import { SIGNS } from "@/config/zodiac";
import { productCode, suggestSku } from "@/lib/sku";
import { routes } from "@/lib/routes";
import { cn } from "@/lib/cn";
import { deleteProductAction, discardProductDraftAction, duplicateProductAction, saveProductAction, saveProductDraftAction } from "@/actions/admin/products";
import { saveHsnAction } from "@/actions/admin/catalog";
import type { FormState } from "@/actions/admin/shared";
import { BADGES, TYPE_LABEL, type BadgeKey, type ProductType } from "@/server/catalog/types";
import type { EditorValue } from "@/server/admin/product-form";
import { btnPrimary, btnSecondary, Card, FieldLabel, inputCls } from "../ui";
import { FormStatus } from "../FormStatus";
import { useUnsavedGuard } from "../useUnsavedGuard";
import { RichText } from "../RichText";
import { ChipInput, ConfirmButton, Switch } from "../widgets";
import { MediaManager, VariantMediaPanel } from "./MediaManager";
import { imageFirst, useMediaUpload } from "./media-utils";
import { syncVariants, VariantsEditor } from "./VariantsEditor";
import { PublishChecklist } from "./PublishChecklist";
import { publishChecklist } from "@/lib/publish-checklist";
import { APlusEditor } from "./APlusEditor";
import { autosaveNote, draftNote, fromSaved, HistoryButton, useLocalAutosave, VersionBanner } from "./ProductVersions";
import type { ProductInput } from "@/schemas/product";

export interface EditorLookups {
  categories: { id: string; label: string; isActive: boolean }[];
  collections: { id: string; name: string; isActive: boolean }[];
  hsn: { code: string; description: string; gstRatePercent: number }[];
}

const SECTIONS = [
  ["basics", "Basic info"],
  ["organisation", "Organisation"],
  ["media", "Media"],
  ["variants", "Variants & pricing"],
  ["fragrance", "Fragrance"],
  ["details", "Details & A+"],
  ["tax", "Tax & legal"],
  ["seo", "Search listing"],
] as const;

/** New products are created step by step (plan.md §8.5); afterwards the single-page editor is used. */
const STEPS = [
  { label: "Basics", sections: ["basics", "organisation"] },
  { label: "Options, prices & stock", sections: ["variants"] },
  { label: "Photos", sections: ["media"] },
  { label: "Details, tax & search", sections: ["fragrance", "details", "tax", "seo"] },
  { label: "Review", sections: [] },
] as const;

const slugify = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80);
type Tier = "top" | "heart" | "base";

/** ISO ↔ the value of a datetime-local input, in India time (IST has no daylight saving). */
const toIstLocal = (iso: string) => (iso ? new Date(Date.parse(iso) + 330 * 60_000).toISOString().slice(0, 16) : "");
const fromIstLocal = (local: string) => (local ? new Date(`${local}:00+05:30`).toISOString() : "");

/** Strip editor-only fields for the server action. */
const toInput = (v: EditorValue) => ({ ...v, variants: v.variants.map(({ existing: _e, stock: _s, reserved: _r, ...row }) => row) });

export function ProductEditor({ initial, isNew, lookups, orderedSkus, draft = null, showCost = false }: { initial: EditorValue; isNew: boolean; lookups: EditorLookups; orderedSkus: string[]; showCost?: boolean; draft?: { value: ProductInput; by: string; at: string } | null }) {
  const router = useRouter();
  // A new product starts with one row per option value (the default option is Size: 50 ml).
  const [start0] = useState<EditorValue>(() => (initial.variants.length ? initial : { ...initial, variants: syncVariants(initial.options, [], productCode(initial.name || "Product")) }));
  const [v, setV] = useState<EditorValue>(start0);
  const [saved, setSaved] = useState(() => JSON.stringify(start0));
  const [state, setState] = useState<FormState>({});
  const [saving, start] = useTransition();
  const [slugTouched, setSlugTouched] = useState(!isNew);
  const [newHsn, setNewHsn] = useState<{ code: string; description: string; rate: string } | null>(null);
  const [hsnState, setHsnState] = useState<FormState>({});
  const [mediaFor, setMediaFor] = useState<string | null>(null);
  const [issues, setIssues] = useState<{ message: string; section: string }[]>([]);
  const [pendingDraft, setPendingDraft] = useState(draft);
  const [step, setStep] = useState(0);
  const wizard = isNew;
  const show = (id: string) => !wizard || (STEPS[step]!.sections as readonly string[]).includes(id);
  /** In the wizard, a checklist item jumps to the step that holds its section. */
  const jump = (section: string) => {
    const i = STEPS.findIndex((st) => (st.sections as readonly string[]).includes(section));
    if (i >= 0) setStep(i);
    window.scrollTo({ top: 0 });
  };
  const autosave = useLocalAutosave(`aq.product-autosave.${initial.id ?? "new"}`, v, saved);
  const checklist = publishChecklist({ ...v, descriptionText: v.descriptionHtml.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " "), aPlusCount: v.aPlus.length });
  const dirty = JSON.stringify(v) !== saved;
  const set = <K extends keyof EditorValue>(k: K, val: EditorValue[K]) => setV((x) => ({ ...x, [k]: val }));
  const code = v.variants.find((x) => x.existing)?.sku.split("-")[1] ?? productCode(v.name || "Product");
  const hsn = lookups.hsn.find((h) => h.code === v.hsnCode);
  const showFragrance = v.type === "fragrance" || v.notes.top.length + v.notes.heart.length + v.notes.base.length > 0;

  // Warn before leaving with unsaved changes; Ctrl/⌘+S saves.
  useUnsavedGuard(dirty);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        document.getElementById("save-product")?.click();
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, []);

  function save() {
    setState({});
    start(async () => {
      const res = await saveProductAction(toInput(v));
      setState(res);
      setIssues(res.issues ?? []);
      if (!res.ok) return;
      // Newly created variants are now saved: their opening stock became real stock.
      const next = { ...v, variants: v.variants.map((row) => (row.existing ? row : { ...row, existing: true, stock: row.initialStock, initialStock: 0 })) };
      setV(next);
      setSaved(JSON.stringify(next));
      setPendingDraft(null);
      autosave.clear();
      if (isNew && res.id) router.replace(routes.adminProduct(res.id));
      else router.refresh();
    });
  }

  /** Keeps the edits on the server without changing the store (live products). */
  function keepDraft(then?: () => void) {
    setState({});
    start(async () => {
      const res = await saveProductDraftAction(toInput(v));
      setState(res);
      if (res.ok) {
        setPendingDraft(null);
        then?.();
      }
    });
  }

  function preview() {
    const url = routes.productPreview(initial.id!);
    // The preview reads the server draft, so unsaved edits are kept as one first.
    if (dirty) keepDraft(() => window.open(url, "_blank", "noopener"));
    else window.open(url, "_blank", "noopener");
  }

  function setNote(tier: Tier, i: number, patch: Partial<{ name: string; family: string }>) {
    setV((x) => ({ ...x, notes: { ...x.notes, [tier]: x.notes[tier].map((n, j) => (j === i ? { ...n, ...patch } : n)) } }));
  }

  // Photos dropped straight onto a variant row upload into that variant (plan.md §8.4).
  const rowUpload = useMediaUpload({ slug: v.slug, productName: v.name, media: v.media, onAdd: (added) => setV((x) => ({ ...x, media: imageFirst([...x.media, ...added]) })) });
  const variantRefs = v.variants.map((r) => ({ sku: r.sku, label: r.label, optionValues: r.optionValues }));

  /** Options/variants changed: photos of removed variants or option values become shared. */
  function setVariants(options: EditorValue["options"], variants: EditorValue["variants"]) {
    setV((x) => {
      const skus = new Set(variants.map((r) => r.sku));
      const axis = x.imageAxis !== undefined && options[x.imageAxis] ? x.imageAxis : undefined;
      const media = x.media.map((m) => {
        if (m.scope.kind === "variant" && !skus.has(m.scope.sku)) return { ...m, scope: { kind: "shared" as const } };
        if (m.scope.kind === "option" && (axis === undefined || m.scope.axis !== axis || !options[axis]!.values.includes(m.scope.value))) return { ...m, scope: { kind: "shared" as const } };
        return m;
      });
      return { ...x, options, variants, media, imageAxis: axis };
    });
  }

  return (
    <div className={cn("grid grid-cols-1 gap-6 pb-28", !wizard && "2xl:grid-cols-[170px_minmax(0,1fr)]")}>
      <nav aria-label="Sections" className={wizard ? "hidden" : "hidden 2xl:block"}>
        <ul className="sticky top-6 flex flex-col gap-0.5 text-sm">
          {SECTIONS.filter(([id]) => id !== "fragrance" || showFragrance).map(([id, label]) => (
            <li key={id}>
              <a href={`#${id}`} className="block rounded-md px-3 py-1.5 text-neutral-600 hover:bg-neutral-200/70 hover:text-neutral-900">{label}</a>
            </li>
          ))}
        </ul>
      </nav>

      <div className="flex min-w-0 flex-col gap-6">
        {wizard && (
          <nav aria-label="Steps">
            <ol className="flex flex-wrap gap-2">
              {STEPS.map((st, i) => (
                <li key={st.label}>
                  <button
                    type="button"
                    onClick={() => setStep(i)}
                    aria-current={i === step ? "step" : undefined}
                    className={cn("flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm", i === step ? "border-neutral-900 bg-neutral-900 text-white" : i < step ? "border-neutral-300 bg-white text-neutral-800" : "border-neutral-200 bg-white text-neutral-500")}
                  >
                    <span className={cn("grid size-5 place-items-center rounded-full text-xs", i === step ? "bg-white text-neutral-900" : "bg-neutral-100")}>{i + 1}</span>
                    {st.label}
                  </button>
                </li>
              ))}
            </ol>
          </nav>
        )}
        {pendingDraft && (
          <VersionBanner
            onLoad={() => {
              setV(fromSaved(pendingDraft.value, v));
              setPendingDraft(null);
            }}
            loadLabel="Open draft"
            onDiscard={() =>
              start(async () => {
                setState(await discardProductDraftAction(initial.id!));
                setPendingDraft(null);
              })
            }
            discardLabel="Discard it"
          >
            {draftNote(pendingDraft.by, pendingDraft.at)} The store still shows the published version.
          </VersionBanner>
        )}
        {!pendingDraft && autosave.pending && (
          <VersionBanner
            onLoad={() => {
              setV(autosave.pending!.value);
              autosave.dismiss();
            }}
            loadLabel="Restore them"
            onDiscard={autosave.clear}
            discardLabel="Discard"
          >
            {autosaveNote(autosave.pending.at)}
          </VersionBanner>
        )}

        {!isNew && (
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" className={btnSecondary} onClick={preview} disabled={saving}><Eye className="size-4" /> Preview</button>
            <HistoryButton
              id={initial.id!}
              onLoad={(input, at) => {
                setV(fromSaved(input, v));
                setState({ ok: true, message: `Loaded the version from ${at}. Save to make it current.` });
              }}
            />
            {v.status === "active" && (
              <a href={routes.product(initial.slug)} target="_blank" rel="noreferrer" className={btnSecondary}><ExternalLink className="size-4" /> View in store</a>
            )}
            <button
              type="button"
              className={btnSecondary}
              onClick={() =>
                start(async () => {
                  const res = await duplicateProductAction(initial.id!);
                  if (res.id) router.push(routes.adminProduct(res.id));
                  else setState(res);
                })
              }
            >
              <Copy className="size-4" /> Duplicate
            </button>
            <ConfirmButton
              confirm={orderedSkus.length ? "This product has orders, so it will be archived. Continue?" : "Delete this product permanently?"}
              action={() => deleteProductAction(initial.id!)}
              onDone={(res) => (res.ok ? router.push("/admin/products") : setState(res))}
            >
              <Trash2 className="size-4" /> {orderedSkus.length ? "Archive" : "Delete"}
            </ConfirmButton>
          </div>
        )}

        <section id="basics" hidden={!show("basics")} className="scroll-mt-6">
          <Card title="Basic info">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <FieldLabel label="Product name">
                <input className={inputCls} value={v.name} maxLength={80} onChange={(e) => {
                    const name = e.target.value;
                    setV((x) => {
                      // Unsaved variants still on their auto SKU follow the name.
                      const before = productCode(x.name || "Product");
                      const after = productCode(name || "Product");
                      const variants = x.variants.map((row) => (!row.existing && row.sku === suggestSku(before, row.optionValues) ? { ...row, sku: suggestSku(after, row.optionValues) } : row));
                      return { ...x, name, variants, slug: slugTouched ? x.slug : slugify(name + (x.zodiacSign ? `-${x.zodiacSign}` : "")) };
                    });
                  }} />
              </FieldLabel>
              <FieldLabel label="URL" hint={`/perfume/${v.slug || "…"}`}>
                <input className={`${inputCls} font-mono`} value={v.slug} onChange={(e) => { setSlugTouched(true); set("slug", e.target.value.toLowerCase()); }} />
              </FieldLabel>
              <FieldLabel label="Product type">
                <select className={inputCls} value={v.type} onChange={(e) => set("type", e.target.value as ProductType)}>
                  {(Object.keys(TYPE_LABEL) as ProductType[]).map((t) => <option key={t} value={t}>{TYPE_LABEL[t]}</option>)}
                </select>
              </FieldLabel>
              <FieldLabel label="Status" hint="Only active products are visible in the store.">
                <select className={inputCls} value={v.status} onChange={(e) => set("status", e.target.value as EditorValue["status"])}>
                  <option value="draft">Draft (hidden)</option>
                  <option value="active">Active (live)</option>
                  <option value="archived">Archived</option>
                </select>
              </FieldLabel>
              {v.status !== "archived" && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:col-span-2">
                  {v.status === "draft" && (
                    <FieldLabel label="Go live at (optional)" hint="India time. Checked by the catalogue cron; the publish checklist must pass.">
                      <input type="datetime-local" className={inputCls} value={toIstLocal(v.publishAt)} onChange={(e) => set("publishAt", fromIstLocal(e.target.value))} />
                    </FieldLabel>
                  )}
                  <FieldLabel label="Take down at (optional)" hint="India time. For limited editions: the product goes back to draft.">
                    <input type="datetime-local" className={inputCls} value={toIstLocal(v.unpublishAt)} onChange={(e) => set("unpublishAt", fromIstLocal(e.target.value))} />
                  </FieldLabel>
                </div>
              )}
              <FieldLabel label="Tagline" className="md:col-span-2" hint={`${v.tagline.length}/160 · one line under the name`}>
                <input className={inputCls} maxLength={160} value={v.tagline} onChange={(e) => set("tagline", e.target.value)} />
              </FieldLabel>
              <div className="flex flex-col gap-1.5 md:col-span-2">
                <span className="text-sm font-medium text-neutral-800">Description</span>
                <RichText label="Description" value={v.descriptionHtml} onChange={(html) => set("descriptionHtml", html)} />
                <span className="text-xs text-neutral-500">Shown on the product page. Headings, lists, bold and links are kept; everything else is cleaned on save.</span>
              </div>
            </div>
          </Card>
        </section>

        <section id="organisation" hidden={!show("organisation")} className="scroll-mt-6">
          <Card title="Organisation">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <FieldLabel label="Category" hint="Shoppers browse by category; breadcrumbs follow it.">
                <select className={inputCls} value={v.categoryId} onChange={(e) => set("categoryId", e.target.value)}>
                  <option value="">Choose a category…</option>
                  {lookups.categories.map((c) => <option key={c.id} value={c.id}>{c.label}{c.isActive ? "" : " (hidden)"}</option>)}
                </select>
              </FieldLabel>
              <FieldLabel label="Zodiac sign" hint="Sets the page theme and element. Required for signature fragrances.">
                <select className={inputCls} value={v.zodiacSign ?? ""} onChange={(e) => set("zodiacSign", (e.target.value || undefined) as EditorValue["zodiacSign"])}>
                  <option value="">None (brand theme)</option>
                  {SIGNS.map((s) => <option key={s.slug} value={s.slug}>{s.name} · {s.rashi}</option>)}
                </select>
              </FieldLabel>
              <FieldLabel label="Tags" hint="For search and smart collections. Press Enter after each.">
                <ChipInput lowercase value={v.tags} onChange={(tags) => set("tags", tags)} placeholder="oud, evening, gift" />
              </FieldLabel>
              <FieldLabel label="Sort order" hint="Lower numbers appear first in the store.">
                <input type="number" min={0} className={inputCls} value={v.sortOrder} onChange={(e) => set("sortOrder", Number(e.target.value) || 0)} />
              </FieldLabel>
              <div className="flex flex-col gap-2">
                <span className="text-sm font-medium text-neutral-800">Badges <span className="font-normal text-neutral-500">(up to 3, shown on cards)</span></span>
                <div className="flex flex-wrap gap-2">
                  {(Object.keys(BADGES) as BadgeKey[]).map((b) => {
                    const on = v.badges.includes(b);
                    return (
                      <button key={b} type="button" aria-pressed={on} disabled={!on && v.badges.length >= 3} onClick={() => set("badges", on ? v.badges.filter((x) => x !== b) : [...v.badges, b])} className={cn("rounded-full border px-3 py-1 text-sm transition-colors disabled:opacity-40", on ? "border-neutral-900 bg-neutral-900 text-white" : "border-neutral-300 text-neutral-700 hover:border-neutral-500")}>
                        {BADGES[b]}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <span className="text-sm font-medium text-neutral-800">Hand-picked collections</span>
                {lookups.collections.length === 0 ? (
                  <p className="text-xs text-neutral-500">No manual collections yet. Smart collections pick products by their rules automatically.</p>
                ) : (
                  <div className="flex flex-wrap gap-x-4 gap-y-2">
                    {lookups.collections.map((c) => (
                      <label key={c.id} className="flex items-center gap-2 text-sm">
                        <input type="checkbox" className="size-4" checked={v.collectionIds.includes(c.id)} onChange={(e) => set("collectionIds", e.target.checked ? [...v.collectionIds, c.id] : v.collectionIds.filter((x) => x !== c.id))} />
                        {c.name}{c.isActive ? "" : " (hidden)"}
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </Card>
        </section>

        <section id="media" hidden={!show("media")} className="scroll-mt-6">
          <Card title="Media" actions={<span className="text-xs text-neutral-500">{v.media.length}/40</span>}>
            <MediaManager
              media={v.media}
              slug={v.slug}
              productName={v.name}
              zodiacSign={v.zodiacSign}
              options={v.options}
              variants={variantRefs}
              imageAxis={v.imageAxis}
              onImageAxis={(axis) =>
                setV((x) => ({
                  ...x,
                  imageAxis: axis,
                  // Photos tied to the old axis' values become shared rather than vanish.
                  media: x.media.map((m) => (m.scope.kind === "option" && m.scope.axis !== axis ? { ...m, scope: { kind: "shared" as const } } : m)),
                }))
              }
              sharedAfterVariant={v.display.sharedAfterVariant}
              onSharedAfterVariant={(on) => set("display", { ...v.display, sharedAfterVariant: on })}
              onOpenVariant={setMediaFor}
              onChange={(media) => set("media", media)}
            />
          </Card>
        </section>

        <section id="variants" hidden={!show("variants")} className="scroll-mt-6">
          <Card title="Variants & pricing">
            <VariantsEditor
              options={v.options}
              variants={v.variants}
              media={v.media}
              imageAxis={v.imageAxis}
              orderedSkus={orderedSkus}
              code={code}
              showCost={showCost}
              gstPercent={hsn?.gstRatePercent ?? 18}
              onChange={setVariants}
              onOpenMedia={setMediaFor}
              onDropFiles={(sku, files) => rowUpload.upload(files, { kind: "variant", sku }, v.variants.find((r) => r.sku === sku)?.label ?? "")}
              onSkuRename={(from, to) => setV((x) => ({ ...x, media: x.media.map((m) => (m.scope.kind === "variant" && m.scope.sku === from ? { ...m, scope: { kind: "variant" as const, sku: to } } : m)) }))}
            />
            {rowUpload.busy && <p className="mt-2 flex items-center gap-2 text-sm text-neutral-600"><Loader2 className="size-4 animate-spin" /> {rowUpload.busy}</p>}
            {rowUpload.error && <p role="alert" className="mt-2 text-sm text-red-700">{rowUpload.error}</p>}
          </Card>
        </section>

        {showFragrance && (
          <section id="fragrance" hidden={!show("fragrance")} className="scroll-mt-6">
            <Card title="Fragrance">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <FieldLabel label="Concentration">
                  <select className={inputCls} value={v.concentration ?? ""} onChange={(e) => set("concentration", (e.target.value || undefined) as EditorValue["concentration"])}>
                    <option value="">Not applicable</option>
                    <option value="extrait">Extrait de Parfum</option>
                    <option value="edp">Eau de Parfum</option>
                    <option value="edt">Eau de Toilette</option>
                  </select>
                </FieldLabel>
                <FieldLabel label="Intensity" hint="1 soft · 5 commanding. Sets longevity and season.">
                  <select className={inputCls} value={v.intensity ?? ""} onChange={(e) => set("intensity", e.target.value ? Number(e.target.value) : undefined)}>
                    <option value="">Not set</option>
                    {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}
                  </select>
                </FieldLabel>
                <div className="flex flex-col gap-3 pt-6">
                  <Switch checked={v.display.notes} onChange={(notes) => set("display", { ...v.display, notes })} label="Show the notes pyramid" />
                  <Switch checked={v.display.profile} onChange={(profile) => set("display", { ...v.display, profile })} label="Show the scent profile" />
                </div>
              </div>
              <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-3">
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
              <FieldLabel label="How to wear (optional)" className="mt-6">
                <textarea rows={2} maxLength={1000} className={`${inputCls} h-auto py-2`} value={v.howToWear} onChange={(e) => set("howToWear", e.target.value)} />
              </FieldLabel>
            </Card>
          </section>
        )}

        <section id="details" hidden={!show("details")} className="scroll-mt-6 flex flex-col gap-6">
          <Card title="Specifications" actions={<Switch checked={v.display.specs} onChange={(specs) => set("display", { ...v.display, specs })} label="Show on product page" />}>
            <div className="flex flex-col gap-2">
              {v.specs.map((s, i) => (
                <div key={i} className="grid grid-cols-[1fr_2fr_auto] gap-2">
                  <input aria-label="Specification name" placeholder="Bottle" className={inputCls} value={s.label} onChange={(e) => set("specs", v.specs.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} />
                  <input aria-label="Specification value" placeholder="Hand-finished glass, magnetic cap" className={inputCls} value={s.value} onChange={(e) => set("specs", v.specs.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)))} />
                  <button type="button" aria-label="Remove specification" onClick={() => set("specs", v.specs.filter((_, j) => j !== i))} className="rounded p-2 text-neutral-500 hover:bg-red-50 hover:text-red-700"><Trash2 className="size-4" /></button>
                </div>
              ))}
              {v.specs.length < 20 && (
                <button type="button" className={`${btnSecondary} self-start`} onClick={() => set("specs", [...v.specs, { label: "", value: "" }])}><Plus className="size-4" /> Add specification</button>
              )}
            </div>
          </Card>
          <Card title="A+ content">
            <APlusEditor blocks={v.aPlus} slug={v.slug} onChange={(aPlus) => set("aPlus", aPlus)} />
          </Card>
        </section>

        <section id="tax" hidden={!show("tax")} className="scroll-mt-6">
          <Card title="Tax & legal">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <FieldLabel label="HSN code" hint={hsn ? `GST ${hsn.gstRatePercent}% · ${hsn.description}` : "GST comes from the HSN list."}>
                  <select className={`${inputCls} font-mono`} value={v.hsnCode} onChange={(e) => set("hsnCode", e.target.value)}>
                    {!hsn && <option value={v.hsnCode}>{v.hsnCode} (not in the list)</option>}
                    {lookups.hsn.map((h) => <option key={h.code} value={h.code}>{h.code} · {h.gstRatePercent}% · {h.description.slice(0, 40)}</option>)}
                  </select>
                </FieldLabel>
                {newHsn ? (
                  <div className="mt-2 grid grid-cols-[110px_1fr_80px] gap-2 rounded-lg border border-neutral-200 p-2">
                    <input aria-label="New HSN code" placeholder="33030050" className={`${inputCls} font-mono`} value={newHsn.code} onChange={(e) => setNewHsn({ ...newHsn, code: e.target.value })} />
                    <input aria-label="Description" placeholder="Description" className={inputCls} value={newHsn.description} onChange={(e) => setNewHsn({ ...newHsn, description: e.target.value })} />
                    <select aria-label="GST rate" className={inputCls} value={newHsn.rate} onChange={(e) => setNewHsn({ ...newHsn, rate: e.target.value })}>
                      {[0, 3, 5, 12, 18, 28].map((r) => <option key={r} value={r}>{r}%</option>)}
                    </select>
                    <div className="col-span-3 flex flex-wrap items-center gap-2">
                      <button type="button" className={btnSecondary} onClick={() => start(async () => {
                        const res = await saveHsnAction({ code: newHsn.code, description: newHsn.description, gstRatePercent: Number(newHsn.rate), isActive: true });
                        setHsnState(res);
                        if (res.ok) { set("hsnCode", newHsn.code); setNewHsn(null); router.refresh(); }
                      })}>Add code</button>
                      <button type="button" className="text-sm text-neutral-600 hover:text-neutral-900" onClick={() => setNewHsn(null)}>Cancel</button>
                      <FormStatus state={hsnState} />
                    </div>
                  </div>
                ) : (
                  <button type="button" className="self-start text-sm font-medium text-neutral-700 underline-offset-4 hover:underline" onClick={() => setNewHsn({ code: "", description: "", rate: "18" })}>+ New HSN code</button>
                )}
              </div>
              <FieldLabel label="Generic name" hint="As printed on the pack (Legal Metrology).">
                <input className={inputCls} value={v.genericName} onChange={(e) => set("genericName", e.target.value)} />
              </FieldLabel>
              <FieldLabel label="Manufactured by" className="md:col-span-2"><input className={inputCls} value={v.manufacturer} onChange={(e) => set("manufacturer", e.target.value)} /></FieldLabel>
              <FieldLabel label="Packed / marketed by (optional)"><input className={inputCls} value={v.packer} onChange={(e) => set("packer", e.target.value)} /></FieldLabel>
              <FieldLabel label="Country of origin"><input className={inputCls} value={v.countryOfOrigin} onChange={(e) => set("countryOfOrigin", e.target.value)} /></FieldLabel>
            </div>
          </Card>
        </section>

        <section id="seo" hidden={!show("seo")} className="scroll-mt-6">
          <Card title="Search engine listing">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div className="flex flex-col gap-4">
                <FieldLabel label="Page title (optional)" hint={`${v.seoTitle.length}/60 recommended`}><input className={inputCls} maxLength={70} value={v.seoTitle} onChange={(e) => set("seoTitle", e.target.value)} /></FieldLabel>
                <FieldLabel label="Meta description (optional)" hint={`${v.seoDescription.length}/155 recommended`}><textarea rows={3} maxLength={170} className={`${inputCls} h-auto py-2`} value={v.seoDescription} onChange={(e) => set("seoDescription", e.target.value)} /></FieldLabel>
                <FieldLabel label="Keywords (optional)"><ChipInput value={v.seoKeywords} max={15} onChange={(k) => set("seoKeywords", k)} placeholder="aries perfume, saffron perfume" /></FieldLabel>
              </div>
              <div className="self-start rounded-lg border border-neutral-200 p-4" aria-label="Search preview">
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-neutral-500">Google preview</p>
                <p className="truncate text-xs text-emerald-800">aaliqadr.com › perfume › {v.slug || "…"}</p>
                <p className="truncate text-lg text-blue-800">{v.seoTitle || `${v.name || "Product name"} · Aaliqadr`}</p>
                <p className="line-clamp-2 text-sm text-neutral-600">{v.seoDescription || v.tagline || "Add a tagline or meta description."}</p>
              </div>
            </div>
          </Card>
        </section>

        {wizard && step === STEPS.length - 1 && (
          <Card title="Review">
            <dl className="mb-4 grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-4">
              <dt className="text-neutral-500">Name</dt><dd>{v.name || "—"}</dd>
              <dt className="text-neutral-500">Variants</dt><dd>{v.variants.filter((r) => r.isActive).length} active of {v.variants.length}</dd>
              <dt className="text-neutral-500">Photos</dt><dd>{v.media.filter((m) => m.kind === "image").length}</dd>
              <dt className="text-neutral-500">Price from</dt><dd>₹{Math.min(...v.variants.map((r) => r.price), Infinity) || 0}</dd>
            </dl>
            {checklist.length ? (
              <ul className="flex flex-col gap-1 text-sm">
                {checklist.map((i, n) => (
                  <li key={n} className="flex items-start gap-2">
                    <span className={i.level === "blocker" ? "text-red-700" : "text-amber-700"}>{i.level === "blocker" ? "Needed to go live:" : "Tip:"}</span>
                    <span className="flex-1">{i.message}</span>
                    <button type="button" onClick={() => jump(i.section)} className="text-xs underline underline-offset-4">Fix</button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-emerald-700">Everything needed to go live is in place.</p>
            )}
            <p className="mt-4 text-sm text-neutral-600">
              {v.status === "active" ? "It will go live as soon as you create it." : "It will be created as a draft, hidden from the store. You can preview it, then set it live."}
            </p>
          </Card>
        )}

        {wizard && (
          <div className="flex flex-wrap gap-2">
            {step > 0 && <button type="button" className={btnSecondary} onClick={() => { setStep(step - 1); window.scrollTo({ top: 0 }); }}>Back</button>}
            {step < STEPS.length - 1 && <button type="button" className={btnPrimary} onClick={() => { setStep(step + 1); window.scrollTo({ top: 0 }); }}>Next: {STEPS[step + 1]!.label}</button>}
          </div>
        )}
      </div>

      {mediaFor && (
        <VariantMediaPanel
          sku={mediaFor}
          media={v.media}
          onChange={(media) => set("media", media)}
          variants={variantRefs}
          options={v.options}
          imageAxis={v.imageAxis}
          slug={v.slug}
          productName={v.name}
          onClose={() => setMediaFor(null)}
        />
      )}

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-neutral-200 bg-white/95 px-4 py-3 backdrop-blur lg:left-[262px]">
        <div className="mx-auto flex max-w-[1240px] flex-wrap items-center gap-3">
          <PublishChecklist items={checklist} serverIssues={issues} status={v.status} onJump={wizard ? jump : undefined} />
          <div className="min-w-0 flex-1">{state.error || state.ok ? <FormStatus state={state} /> : <p className="text-sm text-neutral-500">{dirty ? "Unsaved changes" : isNew ? `Step ${step + 1} of ${STEPS.length}. You can create it at any step.` : "All changes saved."}</p>}</div>
          <button type="button" onClick={() => router.push("/admin/products")} className={btnSecondary}>Back to products</button>
          {!isNew && initial.status === "active" && (
            <button type="button" onClick={() => keepDraft()} disabled={saving || !dirty} className={btnSecondary} title="Keep these edits without changing the store">
              <FileClock className="size-4" /> Save as draft
            </button>
          )}
          <button id="save-product" type="button" onClick={save} disabled={saving || (!dirty && !isNew)} className={btnPrimary}>
            {saving && <Loader2 className="size-4 animate-spin" />} {isNew ? "Create product" : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
