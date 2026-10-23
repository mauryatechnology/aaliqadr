"use client";

import { useState, useTransition } from "react";
import { Download, Loader2 } from "lucide-react";
import { exportInvoicesCsvAction, exportReportCsvAction } from "@/actions/admin/reports";
import { downloadCsv } from "../product/ProductCsvTools";
import { btnSecondary } from "../ui";

/** Downloads a report or the invoice register as CSV. */
export function CsvButton({ label, file, report, invoicesFy }: { label: string; file: string; report?: { kind: "daily" | "products" | "hsn" | "states"; from: string; to: string }; invoicesFy?: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        className={btnSecondary}
        disabled={pending}
        onClick={() =>
          start(async () => {
            const res = report ? await exportReportCsvAction(report.kind, { from: report.from, to: report.to }) : await exportInvoicesCsvAction(invoicesFy ?? "");
            if (res.csv) downloadCsv(res.csv, file);
            else setError(res.error ?? "Export failed.");
          })
        }
      >
        {pending ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />} {label}
      </button>
      {error && <span className="text-xs text-red-700">{error}</span>}
    </span>
  );
}
