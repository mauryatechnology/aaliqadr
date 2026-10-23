"use client";

import Image from "next/image";
import Link from "next/link";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { FolderPlus, Loader2, Pencil, Plus, X } from "lucide-react";
import { deleteCategoryAction, saveCategoryAction } from "@/actions/admin/catalog";
import type { FormState } from "@/actions/admin/shared";
import type { CategoryInput } from "@/schemas/product";
import { cn } from "@/lib/cn";
import { Badge, btnPrimary, btnSecondary, FieldLabel, inputCls, td, th } from "../ui";
import { FormStatus } from "../FormStatus";
import { ConfirmButton, ImageField, Switch } from "../widgets";

export interface CategoryRow {
  id: string;
  name: string;
  slug: string;
  parentId?: string;
  description: string;
  image?: { url: string; alt: string; width: number; height: number };
  sortOrder: number;
  isActive: boolean;
  seo: { title?: string; description?: string };
  depth: number;
  products: number;
}

const slugify = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);
const blank = (parentId?: string): CategoryInput => ({ name: "", slug: "", parentId, description: "", sortOrder: 0, isActive: true, seoTitle: "", seoDescription: "" });

/** Category tree with an edit panel (FlexSell's categories manager). */
export function CategoryManager({ rows }: { rows: CategoryRow[] }) {
  const router = useRouter();
  const [edit, setEdit] = useState<CategoryInput | null>(null);
  const [state, setState] = useState<FormState>({});
  const [listState, setListState] = useState<FormState>({});
  const [pending, start] = useTransition();
  const [slugTouched, setSlugTouched] = useState(false);

  const open = (c?: CategoryRow, parentId?: string) => {
    setState({});
    setSlugTouched(!!c);
    setEdit(c ? { id: c.id, name: c.name, slug: c.slug, parentId: c.parentId, description: c.description, image: c.image, sortOrder: c.sortOrder, isActive: c.isActive, seoTitle: c.seo.title ?? "", seoDescription: c.seo.description ?? "" } : blank(parentId));
  };
  // A category can't move under itself or its own descendants.
  const blocked = new Set<string>();
  if (edit?.id) {
    blocked.add(edit.id);
    let grew = true;
    while (grew) {
      grew = false;
      for (const r of rows) if (r.parentId && blocked.has(r.parentId) && !blocked.has(r.id)) {
        blocked.add(r.id);
        grew = true;
      }
    }
  }

  const save = () =>
    start(async () => {
      if (!edit) return;
      const res = await saveCategoryAction(edit);
      setState(res);
      if (res.ok) {
        setEdit(null);
        setListState(res);
        router.refresh();
      }
    });

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
      <div className="flex flex-col gap-3">
        <FormStatus state={listState} />
        <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white shadow-sm">
          <table className="w-full min-w-[640px] border-collapse text-left text-sm">
            <thead><tr><th className={th}>Category</th><th className={th}>URL</th><th className={cn(th, "text-right")}>Products</th><th className={th}>Status</th><th className={cn(th, "text-right")}>Actions</th></tr></thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.id} className={cn("hover:bg-neutral-50", edit?.id === c.id && "bg-neutral-50")}>
                  <td className={td}>
                    <div className="flex items-center gap-3" style={{ paddingLeft: c.depth * 24 }}>
                      <span className="relative size-9 shrink-0 overflow-hidden rounded-md bg-neutral-100">{c.image && <Image src={c.image.url} alt="" fill sizes="36px" className="object-cover" />}</span>
                      <span className="font-medium">{c.depth > 0 && <span className="mr-1 text-neutral-400">↳</span>}{c.name}</span>
                    </div>
                  </td>
                  <td className={cn(td, "font-mono text-xs text-neutral-600")}>/category/{c.slug}</td>
                  <td className={cn(td, "text-right tabular-nums")}>
                    {c.products ? <Link href={`/admin/products?category=${c.id}` as Route} className="underline-offset-4 hover:underline">{c.products}</Link> : 0}
                  </td>
                  <td className={td}>{c.isActive ? <Badge tone="green">Visible</Badge> : <Badge>Hidden</Badge>}</td>
                  <td className={cn(td, "text-right")}>
                    <div className="flex justify-end gap-1">
                      <button type="button" title="Add sub-category" aria-label={`Add a sub-category to ${c.name}`} onClick={() => open(undefined, c.id)} className="rounded p-2 text-neutral-600 hover:bg-neutral-100"><FolderPlus className="size-4" /></button>
                      <button type="button" title="Edit" aria-label={`Edit ${c.name}`} onClick={() => open(c)} className="rounded p-2 text-neutral-600 hover:bg-neutral-100"><Pencil className="size-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button type="button" className={cn(btnSecondary, "self-start")} onClick={() => open()}><Plus className="size-4" /> New top-level category</button>
      </div>

      {edit ? (
        <aside className="self-start rounded-xl border border-neutral-200 bg-white shadow-sm xl:sticky xl:top-6">
          <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-3">
            <h2 className="text-sm font-semibold">{edit.id ? `Edit ${edit.name || "category"}` : "New category"}</h2>
            <button type="button" aria-label="Close" onClick={() => setEdit(null)} className="rounded p-1 hover:bg-neutral-100"><X className="size-4" /></button>
          </div>
          <div className="flex flex-col gap-4 p-5">
            <FieldLabel label="Name"><input className={inputCls} value={edit.name} maxLength={60} onChange={(e) => setEdit({ ...edit, name: e.target.value, slug: slugTouched ? edit.slug : slugify(e.target.value) })} /></FieldLabel>
            <FieldLabel label="URL" hint={`/category/${edit.slug || "…"}`}><input className={`${inputCls} font-mono`} value={edit.slug} onChange={(e) => { setSlugTouched(true); setEdit({ ...edit, slug: e.target.value.toLowerCase() }); }} /></FieldLabel>
            <FieldLabel label="Parent">
              <select className={inputCls} value={edit.parentId ?? ""} onChange={(e) => setEdit({ ...edit, parentId: e.target.value || undefined })}>
                <option value="">None (top level)</option>
                {rows.filter((r) => !blocked.has(r.id)).map((r) => <option key={r.id} value={r.id}>{"— ".repeat(r.depth)}{r.name}</option>)}
              </select>
            </FieldLabel>
            <FieldLabel label="Description" hint="Shown at the top of the category page."><textarea rows={3} maxLength={600} className={`${inputCls} h-auto py-2`} value={edit.description} onChange={(e) => setEdit({ ...edit, description: e.target.value })} /></FieldLabel>
            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-neutral-800">Image</span>
              <ImageField value={edit.image} prefix="catalog/categories" onChange={(image) => setEdit({ ...edit, image })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FieldLabel label="Sort order"><input type="number" min={0} className={inputCls} value={edit.sortOrder} onChange={(e) => setEdit({ ...edit, sortOrder: Number(e.target.value) || 0 })} /></FieldLabel>
              <div className="pt-7"><Switch checked={edit.isActive} onChange={(isActive) => setEdit({ ...edit, isActive })} label="Visible in store" /></div>
            </div>
            <details className="rounded-lg border border-neutral-200 p-3">
              <summary className="cursor-pointer text-sm font-medium">Search listing (optional)</summary>
              <div className="mt-3 flex flex-col gap-3">
                <FieldLabel label="Page title" hint={`${edit.seoTitle.length}/60`}><input className={inputCls} maxLength={70} value={edit.seoTitle} onChange={(e) => setEdit({ ...edit, seoTitle: e.target.value })} /></FieldLabel>
                <FieldLabel label="Meta description" hint={`${edit.seoDescription.length}/155`}><textarea rows={2} maxLength={170} className={`${inputCls} h-auto py-2`} value={edit.seoDescription} onChange={(e) => setEdit({ ...edit, seoDescription: e.target.value })} /></FieldLabel>
              </div>
            </details>
            <FormStatus state={state} />
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" className={btnPrimary} onClick={save} disabled={pending}>{pending && <Loader2 className="size-4 animate-spin" />} {edit.id ? "Save" : "Create"}</button>
              {edit.id && (
                <ConfirmButton confirm="Delete this category?" action={() => deleteCategoryAction(edit.id!)} onDone={(res) => { setListState(res); if (res.ok) { setEdit(null); router.refresh(); } }}>
                  Delete
                </ConfirmButton>
              )}
              {edit.id && <Link href={`/admin/products/new?category=${edit.id}` as Route} className="text-sm text-neutral-600 underline-offset-4 hover:underline">Add a product here</Link>}
            </div>
          </div>
        </aside>
      ) : (
        <aside className="self-start rounded-xl border border-dashed border-neutral-300 p-5 text-sm text-neutral-600">
          Choose a category to edit it, or add a sub-category with the folder button. Categories with products or sub-categories can&apos;t be deleted until they&apos;re moved.
        </aside>
      )}
    </div>
  );
}
