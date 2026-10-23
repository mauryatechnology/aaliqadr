"use server";

import { z } from "zod";
import { toCsv } from "@/lib/csv";
import { requireRole } from "@/server/auth";
import { listInvoices, salesReport } from "@/server/admin/ops";
import { toFormError } from "./shared";

/** CSV downloads for reports and invoices (docs/11 §3.11). Admin role. */

const rupees = (p: number) => (p / 100).toFixed(2);
const range = z.object({ from: z.coerce.date(), to: z.coerce.date() }).refine((r) => r.to > r.from && r.to.getTime() - r.from.getTime() <= 400 * 86_400_000, "Choose a range of up to 13 months");

export async function exportReportCsvAction(kind: "daily" | "products" | "hsn" | "states", raw: unknown): Promise<{ csv?: string; error?: string }> {
  try {
    await requireRole("admin");
    const { from, to } = range.parse(raw);
    const r = await salesReport(from, to);
    switch (kind) {
      case "daily":
        return { csv: toCsv(["date", "invoices", "gross_inr", "gst_inr"], r.daily.map((d) => [d._id, d.orders, rupees(d.grossP), rupees(d.taxP)])) };
      case "products":
        return { csv: toCsv(["sku", "product", "variant", "units", "net_sales_inr"], r.byProduct.map((p) => [p.sku, p.name, p.label, p.qty, rupees(p.netP)])) };
      case "hsn":
        // GSTR-1 table 12 (HSN-wise summary of outward supplies).
        return { csv: toCsv(["hsn", "uqc", "total_quantity", "total_value_inr", "rate_percent", "taxable_value_inr", "igst_inr", "cgst_inr", "sgst_inr"], r.hsn.map((h) => [h.hsn, "NOS", h.qty, rupees(h.valueP), h.ratePercent, rupees(h.taxableP), rupees(h.igstP), rupees(h.cgstP), rupees(h.sgstP)])) };
      case "states":
        // B2C (small) summary by place of supply (GSTR-1 table 7).
        return { csv: toCsv(["place_of_supply", "invoices", "invoice_value_inr", "taxable_value_inr", "igst_inr", "cgst_inr", "sgst_inr"], r.byState.map((s) => [s.state, s.orders, rupees(s.grossP), rupees(s.taxableP), rupees(s.igstP), rupees(s.cgstP), rupees(s.sgstP)])) };
    }
  } catch (e) {
    return { error: e instanceof z.ZodError ? (e.issues[0]?.message ?? "Check the dates.") : toFormError(e, "export_report").error };
  }
}

export async function exportInvoicesCsvAction(fy: string): Promise<{ csv?: string; error?: string }> {
  try {
    await requireRole("admin");
    const year = z.string().regex(/^\d{4}-\d{2}$/).parse(fy);
    const rows: unknown[][] = [];
    for (let page = 1; page < 400; page++) {
      const { rows: batch } = await listInvoices("", year, page);
      for (const o of batch)
        rows.push([o.invoice?.number, o.invoice?.issuedAt ? new Date(o.invoice.issuedAt).toISOString().slice(0, 10) : "", o._id, o.contact.name, o.shippingAddress?.state ?? "", o.placeOfSupply?.isInterState ? "inter" : "intra", rupees(o.pricing.taxableP), rupees(o.pricing.cgstP), rupees(o.pricing.sgstP), rupees(o.pricing.igstP), rupees(o.pricing.totalP), o.status]);
      if (batch.length < 25) break;
    }
    return { csv: toCsv(["invoice", "date", "order", "customer", "place_of_supply", "supply", "taxable_inr", "cgst_inr", "sgst_inr", "igst_inr", "total_inr", "status"], rows) };
  } catch (e) {
    return { error: toFormError(e, "export_invoices").error };
  }
}
