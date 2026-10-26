"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Loader2, PackageCheck, Printer, Truck } from "lucide-react";
import { bulkStartPackingAction, shipFromCsvAction, type ShipImportReport } from "@/actions/admin/orders";
import { btnPrimary, btnSecondary } from "./ui";
import { Drawer } from "./kit/Dialog";
import { toast } from "./kit/Toaster";
import { useFormSelection } from "./kit/useFormSelection";

const FORM = "bulk-orders";

/** Selection bar for the orders table: start packing, print slips, ship from a CSV of AWBs. */
export function OrderBulkBar({ ids }: { ids: { id: string; status: string }[] }) {
  const router = useRouter();
  const { ids: selected, clear } = useFormSelection(FORM);
  const [pending, start] = useTransition();
  const [shipOpen, setShipOpen] = useState(false);
  const confirmed = selected.filter((id) => ids.find((o) => o.id === id)?.status === "confirmed").length;

  return (
    <>
      <form id={FORM} onSubmit={(e) => e.preventDefault()} />
      <div className="mb-2 flex flex-wrap items-center gap-2">
        {selected.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2 rounded-lg border border-neutral-300 bg-white p-1.5 shadow-sm">
            <span className="px-2 text-sm font-medium">{selected.length} selected</span>
            <button
              type="button"
              className={`${btnSecondary} h-8`}
              disabled={pending || !confirmed}
              title={confirmed ? undefined : "Only confirmed orders can start packing"}
              onClick={() =>
                start(async () => {
                  const res = await bulkStartPackingAction(selected);
                  toast.result(res);
                  if (res.ok) {
                    clear();
                    router.refresh();
                  }
                })
              }
            >
              {pending ? <Loader2 className="size-4 animate-spin" /> : <PackageCheck className="size-4" />} Start packing ({confirmed})
            </button>
            <a href={`/packing-slips?ids=${selected.join(",")}`} target="_blank" rel="noreferrer" className={`${btnSecondary} h-8`}>
              <Printer className="size-4" /> Print packing slips
            </a>
            <button type="button" className="px-2 text-sm text-neutral-600 hover:text-neutral-900" onClick={clear}>Clear</button>
          </div>
        ) : (
          <p className="text-xs text-neutral-500">Tick orders to pack them or print their slips together.</p>
        )}
        <button type="button" className={`${btnSecondary} ml-auto h-8`} onClick={() => setShipOpen(true)}>
          <Truck className="size-4" /> Ship from CSV
        </button>
      </div>
      <ShipFromCsv open={shipOpen} onClose={() => setShipOpen(false)} onDone={() => router.refresh()} />
    </>
  );
}

function ShipFromCsv({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: () => void }) {
  const [text, setText] = useState("");
  const [report, setReport] = useState<ShipImportReport | null>(null);
  const [pending, start] = useTransition();
  const run = (apply: boolean) =>
    start(async () => {
      const r = await shipFromCsvAction(text, apply);
      setReport(r);
      if (r.error) toast.error(r.error);
      if (r.applied) {
        toast.success(`${r.ready.length} order${r.ready.length === 1 ? "" : "s"} marked shipped. Customers have been emailed.`);
        onDone();
      }
    });
  return (
    <Drawer
      open={open}
      title="Mark shipped from a CSV"
      onClose={onClose}
      footer={
        <div className="flex justify-end gap-2">
          <button type="button" className={btnSecondary} disabled={pending || !text} onClick={() => run(false)}>Check file</button>
          <button type="button" className={btnPrimary} disabled={pending || !report || report.applied || !report.ready.length} onClick={() => run(true)}>
            {pending && <Loader2 className="size-4 animate-spin" />} Mark {report?.ready.length ?? 0} shipped
          </button>
        </div>
      }
    >
      <div className="flex flex-col gap-3 text-sm">
        <p className="text-neutral-600">Columns: <code>order,courier,awb,tracking_url</code> (tracking URL optional). Check the file first; nothing changes until you confirm.</p>
        <input
          type="file"
          accept=".csv,text/csv"
          onChange={async (e) => {
            const f = e.target.files?.[0];
            if (f) {
              setText(await f.text());
              setReport(null);
            }
          }}
        />
        <textarea value={text} onChange={(e) => { setText(e.target.value); setReport(null); }} rows={8} placeholder={"order,courier,awb\nAQ-100123,Delhivery,1234567890"} className="rounded-lg border border-neutral-300 p-2 font-mono text-xs" />
        {report && !report.error && (
          <div className="flex flex-col gap-2">
            <p className="font-medium">{report.applied ? "Done." : `${report.ready.length} ready to mark shipped.`}</p>
            {report.problems.length > 0 && (
              <ul className="list-disc pl-5 text-red-800">
                {report.problems.map((p, i) => <li key={i}><b>{p.order}</b>: {p.message}</li>)}
              </ul>
            )}
          </div>
        )}
      </div>
    </Drawer>
  );
}
