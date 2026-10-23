"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { FileUp, Loader2 } from "lucide-react";
import { importStockCsvAction, type StockImportReport } from "@/actions/admin/store";
import { btnPrimary, btnSecondary, inputCls } from "../ui";

/** Stocktake or bulk receipt from a CSV: preview, then apply through the ledger. */
export function StockCsvImport() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [reason, setReason] = useState("");
  const [report, setReport] = useState<StockImportReport | null>(null);
  const [pending, start] = useTransition();
  if (!open) return <button type="button" className={btnSecondary} onClick={() => setOpen(true)}><FileUp className="size-4" /> Import stock CSV</button>;
  return (
    <div className="flex w-full flex-col gap-3 rounded-xl border border-neutral-200 bg-white p-4 text-sm shadow-sm">
      <p className="text-neutral-700">Columns: <code>sku</code> and either <code>count</code> (what you counted: sets the stock) or <code>delta</code> (+12 received, −2 damaged).</p>
      <div className="flex flex-wrap gap-2">
        <input type="file" accept=".csv,text/csv" onChange={async (e) => { const f = e.target.files?.[0]; if (f) { setText(await f.text()); setReport(null); } }} className="text-sm" />
        <input className={`${inputCls} w-72`} placeholder="Reason (e.g. Stocktake 31 Oct)" value={reason} onChange={(e) => setReason(e.target.value)} />
        <button type="button" className={btnSecondary} disabled={!text || pending} onClick={() => start(async () => setReport(await importStockCsvAction(text, reason, false)))}>Preview</button>
        <button type="button" className="px-2 text-neutral-600" onClick={() => setOpen(false)}>Close</button>
      </div>
      {pending && <Loader2 className="size-4 animate-spin" />}
      {report && (
        <div className="flex flex-col gap-2">
          {report.error && <p className="text-red-700">{report.error}</p>}
          {report.problems.length > 0 && <ul className="list-disc pl-5 text-red-800">{report.problems.slice(0, 30).map((p) => <li key={p}>{p}</li>)}</ul>}
          {report.changes.length > 0 && (
            <ul className="max-h-48 overflow-y-auto font-mono text-xs">
              {report.changes.map((c) => <li key={c.sku}>{c.sku}: {c.from} → {c.to} ({c.delta > 0 ? "+" : ""}{c.delta})</li>)}
            </ul>
          )}
          {report.applied ? (
            <p className="text-emerald-800">Applied {report.changes.length} change{report.changes.length === 1 ? "" : "s"}.</p>
          ) : (
            !report.error && report.problems.length === 0 && report.changes.length > 0 && (
              <button type="button" className={`${btnPrimary} self-start`} disabled={pending} onClick={() => start(async () => { const r = await importStockCsvAction(text, reason, true); setReport(r); if (r.applied) router.refresh(); })}>Apply {report.changes.length} change{report.changes.length === 1 ? "" : "s"}</button>
            )
          )}
          {!report.error && report.changes.length === 0 && report.problems.length === 0 && <p className="text-neutral-600">Nothing to change: the counts already match.</p>}
        </div>
      )}
    </div>
  );
}
