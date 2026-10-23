"use client";

import Link from "next/link";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Loader2, Pencil, Plus } from "lucide-react";
import { deleteHsnAction, saveHsnAction } from "@/actions/admin/catalog";
import type { FormState } from "@/actions/admin/shared";
import type { HsnInput } from "@/schemas/product";
import { cn } from "@/lib/cn";
import { Badge, btnPrimary, btnSecondary, inputCls, td, th } from "../ui";
import { FormStatus } from "../FormStatus";
import { ConfirmButton } from "../widgets";

export interface HsnRow {
  id: string;
  code: string;
  description: string;
  gstRatePercent: number;
  isActive: boolean;
  products: number;
}

const RATES = [0, 0.25, 3, 5, 12, 18, 28];

/** HSN master with GST slabs and the intra/inter-state split preview (FlexSell's HSN management). */
export function HsnManager({ rows }: { rows: HsnRow[] }) {
  const router = useRouter();
  const [edit, setEdit] = useState<HsnInput | null>(null);
  const [state, setState] = useState<FormState>({});
  const [pending, start] = useTransition();

  const save = () =>
    start(async () => {
      if (!edit) return;
      const res = await saveHsnAction(edit);
      setState(res);
      if (res.ok) {
        setEdit(null);
        router.refresh();
      }
    });

  const formRow = (key: string) => (
    <tr key={key} className="bg-neutral-50">
      <td className={td}><input aria-label="HSN code" placeholder="33030050" className={`${inputCls} w-32 font-mono`} value={edit?.code ?? ""} onChange={(e) => edit && setEdit({ ...edit, code: e.target.value })} /></td>
      <td className={td}><input aria-label="Description" placeholder="Perfumes and toilet waters" className={inputCls} value={edit?.description ?? ""} onChange={(e) => edit && setEdit({ ...edit, description: e.target.value })} /></td>
      <td className={td}>
        <select aria-label="GST rate" className={`${inputCls} w-24`} value={edit?.gstRatePercent ?? 18} onChange={(e) => edit && setEdit({ ...edit, gstRatePercent: Number(e.target.value) })}>
          {RATES.map((r) => <option key={r} value={r}>{r}%</option>)}
        </select>
      </td>
      <td className={cn(td, "text-xs text-neutral-600")}>{edit ? `${edit.gstRatePercent / 2}% + ${edit.gstRatePercent / 2}%` : ""}</td>
      <td className={td}><label className="flex items-center gap-2 text-sm"><input type="checkbox" className="size-4" checked={edit?.isActive ?? true} onChange={(e) => edit && setEdit({ ...edit, isActive: e.target.checked })} /> Active</label></td>
      <td className={cn(td, "text-right")} colSpan={2}>
        <div className="flex justify-end gap-2">
          <button type="button" className={cn(btnPrimary, "h-9")} onClick={save} disabled={pending}>{pending && <Loader2 className="size-4 animate-spin" />} Save</button>
          <button type="button" className={cn(btnSecondary, "h-9")} onClick={() => setEdit(null)}>Cancel</button>
        </div>
      </td>
    </tr>
  );

  return (
    <div className="flex flex-col gap-3">
      <FormStatus state={state} />
      <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white shadow-sm">
        <table className="w-full min-w-[820px] border-collapse text-left text-sm">
          <thead>
            <tr><th className={th}>HSN</th><th className={th}>Description</th><th className={th}>GST</th><th className={th}>In state (CGST + SGST)</th><th className={th}>Status</th><th className={cn(th, "text-right")}>Products</th><th className={cn(th, "text-right")}>Actions</th></tr>
          </thead>
          <tbody>
            {rows.map((h) =>
              edit?.id === h.id ? (
                formRow(h.id)
              ) : (
                <tr key={h.id} className="hover:bg-neutral-50">
                  <td className={cn(td, "font-mono")}>{h.code}</td>
                  <td className={td}>{h.description}</td>
                  <td className={cn(td, "tabular-nums")}>{h.gstRatePercent}%</td>
                  <td className={cn(td, "text-xs text-neutral-600")}>{h.gstRatePercent / 2}% + {h.gstRatePercent / 2}% · other states IGST {h.gstRatePercent}%</td>
                  <td className={td}>{h.isActive ? <Badge tone="green">Active</Badge> : <Badge>Off</Badge>}</td>
                  <td className={cn(td, "text-right tabular-nums")}>{h.products ? <Link href={`/admin/products?q=${h.code}` as Route} className="underline-offset-4 hover:underline">{h.products}</Link> : 0}</td>
                  <td className={cn(td, "text-right")}>
                    <div className="flex items-center justify-end gap-1">
                      <button type="button" aria-label={`Edit ${h.code}`} className="rounded p-2 text-neutral-600 hover:bg-neutral-100" onClick={() => { setState({}); setEdit({ id: h.id, code: h.code, description: h.description, gstRatePercent: h.gstRatePercent, isActive: h.isActive }); }}><Pencil className="size-4" /></button>
                      {h.products === 0 && (
                        <ConfirmButton className="rounded px-2 py-1.5 text-sm text-neutral-600 hover:bg-red-50 hover:text-red-700" confirm={`Delete ${h.code}?`} action={() => deleteHsnAction(h.id)} onDone={(res) => { setState(res); router.refresh(); }}>
                          Delete
                        </ConfirmButton>
                      )}
                    </div>
                  </td>
                </tr>
              ),
            )}
            {edit && !edit.id && formRow("new")}
          </tbody>
        </table>
      </div>
      {!edit && (
        <button type="button" className={cn(btnSecondary, "self-start")} onClick={() => { setState({}); setEdit({ code: "", description: "", gstRatePercent: 18, isActive: true }); }}>
          <Plus className="size-4" /> Add HSN code
        </button>
      )}
      <p className="text-xs text-neutral-500">Changing a rate updates every product on that code; past orders and invoices keep the rate they were sold at. Confirm codes and rates with your CA.</p>
    </div>
  );
}
