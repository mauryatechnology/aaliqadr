"use server";

import { toCsv } from "@/lib/csv";
import { parseList } from "@/lib/list-params";
import { requireRole, type Role } from "@/server/auth";
import { AuditLog } from "@/server/models/commerce";
import { db } from "@/server/db/connect";
import { listSpec, type ListKind, LIST_SPECS } from "@/server/admin/list-kinds";
import {
  listAuditPaged,
  listCouponsPaged,
  listCustomersPaged,
  listInventoryPaged,
  listInvoicesPaged,
  listLedgerPaged,
  listOrdersPaged,
  listProductsPaged,
  listReturnsPaged,
  listReviewsPaged,
} from "@/server/admin/lists";
import { toFormError } from "./shared";

/**
 * CSV export of the current list view (plan.md §3), honouring the same search and filters.
 * Lists with personal data are owner-only; every export is audited and the file says who
 * made it and when (plan.md §6 item 11).
 */

const ist = new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" });
const rupees = (p: number) => (p / 100).toFixed(2);
const day = (d?: Date | string) => (d ? new Date(d).toISOString().slice(0, 10) : "");

const PERSONAL: ListKind[] = ["orders", "customers", "returns", "reviews", "invoices"];

async function build(kind: ListKind, query: string): Promise<{ header: string[]; rows: (string | number)[][] }> {
  const s = parseList(Object.fromEntries(new URLSearchParams(query)), listSpec(kind));
  switch (kind) {
    case "orders": {
      const { rows } = await listOrdersPaged(s, true);
      return {
        header: ["order", "date", "status", "name", "email", "phone", "city", "state", "pincode", "items", "payment", "payment_status", "total_rupees", "coupon", "awb", "invoice"],
        rows: rows.map((o) => [o._id, day(o.createdAt), o.status, o.contact.name, o.contact.email, o.contact.phone, o.shippingAddress?.city ?? "", o.shippingAddress?.state ?? "", o.shippingAddress?.pincode ?? "", o.items.map((i) => `${i.qty}× ${i.sku}`).join(" | "), o.payment.method, o.payment.status, rupees(o.pricing.totalP), o.pricing.couponCode ?? "", o.shipment?.awb ?? "", o.invoice?.number ?? ""]),
      };
    }
    case "products": {
      const { rows } = await listProductsPaged(s, true);
      return { header: ["name", "slug", "status", "category", "variants", "min_price", "max_price", "stock", "low_stock"], rows: rows.map((p) => [p.name, p.slug, p.status, p.category ?? "", p.variants, rupees(p.minP), rupees(p.maxP), p.stock, p.low ? "yes" : "no"]) };
    }
    case "inventory": {
      const { rows } = await listInventoryPaged(s, true);
      return { header: ["product", "variant", "sku", "barcode", "available", "reserved", "low_stock_at", "active", "product_status"], rows: rows.map((v) => [v.name, v.label, v.sku, v.barcode ?? "", v.stock, v.reserved, v.threshold, v.isActive ? "yes" : "no", v.status]) };
    }
    case "ledger": {
      const { rows } = await listLedgerPaged(s, true);
      return { header: ["date", "sku", "type", "qty", "reference", "reason", "by"], rows: rows.map((m) => [m.createdAt ? new Date(m.createdAt).toISOString() : "", m.sku, m.type, m.qty, m.ref ?? "", m.reason ?? "", m.actor?.name ?? ""]) };
    }
    case "customers": {
      const { rows } = await listCustomersPaged(s, true);
      return { header: ["name", "email", "phone", "role", "joined", "orders", "spent_rupees", "last_order", "open_claims"], rows: rows.map((c) => [c.name, c.email, c.phone ?? "", c.role, day(c.joined), c.orders, rupees(c.spentP), day(c.last), c.openClaims]) };
    }
    case "returns": {
      const { rows } = await listReturnsPaged(s, true);
      return { header: ["claim", "order", "date", "name", "email", "reason", "status", "resolution", "value_rupees", "refund_rupees"], rows: rows.map((r) => [r._id, r.orderId, day(r.createdAt), r.name, r.email, r.reason, r.status, r.resolution ?? "", rupees(r.valueP), rupees(r.refundP ?? 0)]) };
    }
    case "reviews": {
      const { rows } = await listReviewsPaged(s, true);
      return { header: ["date", "product", "rating", "title", "body", "name", "email", "verified", "photos", "status"], rows: rows.map((r) => [day(r.createdAt), r.productName, r.rating, r.title, r.body, r.name, r.email, r.verified ? "yes" : "no", r.photos.length, r.status]) };
    }
    case "coupons": {
      const { rows } = await listCouponsPaged(s, true);
      return { header: ["code", "description", "kind", "value", "min_subtotal", "starts", "ends", "used", "limit", "active"], rows: rows.map((c) => [c.code, c.description, c.kind, c.kind === "percent" ? `${c.valueBps / 100}%` : c.kind === "flat" ? rupees(c.valueP) : "", rupees(c.minSubtotalP), day(c.startsAt), day(c.endsAt), c.usedCount, c.usageLimit, c.isActive ? "yes" : "no"]) };
    }
    case "invoices": {
      const { rows } = await listInvoicesPaged(s, true);
      return {
        header: ["invoice", "date", "order", "name", "email", "state", "supply", "taxable", "cgst", "sgst", "igst", "total"],
        rows: rows.map((o) => [o.invoice?.number ?? "", day(o.invoice?.issuedAt), o._id, o.contact.name, o.contact.email, o.shippingAddress?.state ?? "", o.placeOfSupply?.isInterState ? "inter" : "intra", rupees(o.pricing.taxableP), rupees(o.pricing.cgstP), rupees(o.pricing.sgstP), rupees(o.pricing.igstP), rupees(o.pricing.totalP)]),
      };
    }
    case "audit": {
      const { rows } = await listAuditPaged(s, true);
      return { header: ["date", "action", "record_kind", "record", "by", "role"], rows: rows.map((a) => [a.createdAt ? new Date(a.createdAt).toISOString() : "", a.action, a.entity.kind, a.entity.id, a.actor.name, a.actor.role]) };
    }
  }
}

export async function exportListCsvAction(kind: ListKind, query: string): Promise<{ csv?: string; file?: string; count?: number; error?: string }> {
  try {
    if (!(kind in LIST_SPECS)) return { error: "Unknown list." };
    const min: Role = PERSONAL.includes(kind) ? "owner" : "admin";
    const user = await requireRole(min);
    const { header, rows } = await build(kind, query.slice(0, 2000));
    const stamp = `Exported by ${user.name || user.email} (${user.role}) at ${ist.format(new Date())} IST`;
    await db();
    await AuditLog.create({ actor: { userId: user.id, name: user.name, role: user.role }, action: "export.csv", entity: { kind: "export", id: kind }, detail: { query: query.slice(0, 500), rows: rows.length } });
    const csv = toCsv(header, [...rows, [], [stamp]]);
    return { csv, file: `aaliqadr-${kind}-${new Date().toISOString().slice(0, 10)}.csv`, count: rows.length };
  } catch (e) {
    return { error: toFormError(e, "export_list").error };
  }
}
