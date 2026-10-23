"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Download, FileUp, Loader2, X } from "lucide-react";
import { exportProductsCsvAction, importProductsCsvAction, type ImportReport } from "@/actions/admin/products";
import { btnPrimary, btnSecondary } from "../ui";

export function downloadCsv(csv: string, name: string) {
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const a = Object.assign(document.createElement("a"), { href: url, download: name });
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Bulk catalogue editing through a spreadsheet (FlexSell's bulk operations, CSV instead of
 * XLSX: Excel and Google Sheets open and save it). Export → edit → import shows a preview of
 * what would change; nothing is written until "Apply".
 */
export function ProductCsvTools() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [fileName, setFileName] = useState("");
  const [report, setReport] = useState<ImportReport | null>(null);
  const [pending, start] = useTransition();
  const [error, setError] = useState("");

  const exportCsv = () =>
    start(async () => {
      const res = await exportProductsCsvAction();
      if (res.csv) downloadCsv(res.csv, `aaliqadr-products-${new Date().toISOString().slice(0, 10)}.csv`);
      else setError(res.error ?? "Export failed.");
    });

  const preview = (csv: string) => start(async () => setReport(await importProductsCsvAction(csv, false)));
  const apply = () =>
    start(async () => {
      const res = await importProductsCsvAction(text, true);
      setReport(res);
      if (res.applied) router.refresh();
    });

  return (
    <>
      <button type="button" className={btnSecondary} onClick={exportCsv} disabled={pending}><Download className="size-4" /> Export</button>
      <button type="button" className={btnSecondary} onClick={() => setOpen(true)}><FileUp className="size-4" /> Import</button>
      {error && <span className="text-sm text-red-700">{error}</span>}
      {open && (
        <div role="dialog" aria-modal="true" aria-label="Import products" className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={(e) => e.target === e.currentTarget && setOpen(false)}>
          <div className="flex max-h-[90dvh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-3">
              <h2 className="font-semibold">Import products from CSV</h2>
              <button type="button" aria-label="Close" onClick={() => setOpen(false)} className="rounded p-1 hover:bg-neutral-100"><X className="size-5" /></button>
            </div>
            <div className="flex flex-col gap-4 overflow-y-auto p-5 text-sm">
              <ol className="list-decimal space-y-1 pl-5 text-neutral-700">
                <li><button type="button" onClick={exportCsv} className="font-medium underline underline-offset-4">Export</button> the current catalogue: one row per variant.</li>
                <li>Edit prices, MRP, names, status, tags, badges, weights; add rows for new variants or new products (new products arrive as drafts).</li>
                <li>Upload it here and check the preview. Stock of existing variants is never changed by an import; use Inventory.</li>
              </ol>
              <label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-neutral-300 p-6 text-neutral-600 hover:border-neutral-500">
                <FileUp className="size-6" />
                {fileName || "Choose a .csv file"}
                <input
                  type="file"
                  accept=".csv,text/csv"
                  className="sr-only"
                  onChange={async (e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    const t = await f.text();
                    setFileName(f.name);
                    setText(t);
                    setReport(null);
                    preview(t);
                  }}
                />
              </label>
              {pending && <p className="flex items-center gap-2 text-neutral-600"><Loader2 className="size-4 animate-spin" /> Checking…</p>}
              {report && (
                <div className="flex flex-col gap-2 rounded-xl border border-neutral-200 p-4">
                  {report.error ? (
                    <p className="text-red-700">{report.error}</p>
                  ) : (
                    <>
                      <p className="font-medium">{report.applied ? "Imported." : "Preview: nothing has been saved yet."}</p>
                      <p>{report.created.length} new product{report.created.length === 1 ? "" : "s"} (as drafts) · {report.updated.length} updated</p>
                      {report.problems.length > 0 && (
                        <ul className="max-h-48 list-disc overflow-y-auto pl-5 text-red-800">
                          {report.problems.map((p, i) => <li key={i}><span className="font-mono">{p.slug}</span>: {p.message}</li>)}
                        </ul>
                      )}
                      {report.problems.length > 0 && !report.applied && <p className="text-neutral-600">Fix these rows in the file and upload it again. Nothing is imported while any row has a problem.</p>}
                    </>
                  )}
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2 border-t border-neutral-200 px-5 py-3">
              <button type="button" className={btnSecondary} onClick={() => setOpen(false)}>{report?.applied ? "Done" : "Cancel"}</button>
              {!report?.applied && (
                <button type="button" className={btnPrimary} disabled={pending || !report || !report.ok || (!report.created.length && !report.updated.length)} onClick={apply}>
                  {pending && <Loader2 className="size-4 animate-spin" />} Apply import
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
