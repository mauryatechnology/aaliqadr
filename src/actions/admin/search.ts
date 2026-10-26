"use server";

import { requireRole } from "@/server/auth";
import { db } from "@/server/db/connect";
import { Order } from "@/server/models/Order";
import { Product } from "@/server/models/Product";
import { AuthUser } from "@/server/models/commerce";
import { rx } from "@/lib/list-params";

/** One search box for the command palette (plan.md §4): top 5 orders, products and customers. */

export interface SearchHit {
  kind: "order" | "product" | "customer";
  id: string;
  title: string;
  sub: string;
  href: string;
}

export async function globalSearchAction(q: string): Promise<SearchHit[]> {
  const user = await requireRole("staff");
  const t = q.trim().slice(0, 60);
  if (t.length < 2) return [];
  await db();
  const r = rx(t);
  const [orders, products, customers] = await Promise.all([
    Order.find({ $or: [{ _id: t.toUpperCase() }, { _id: r }, { "contact.email": r }, { "contact.phone": r }, { "contact.name": r }, { "shipment.awb": t }] })
      .sort({ createdAt: -1 })
      .limit(5)
      .select("_id contact.name status pricing.totalP")
      .lean(),
    Product.find({ $or: [{ name: r }, { slug: r }, { "variants.sku": r }] }).limit(5).select("name status variants.sku").lean(),
    // Staff see customers by name only; emails stay with admins (docs/06 §4).
    AuthUser.find(user.role === "staff" ? { name: r } : { $or: [{ name: r }, { email: r }, { phone: r }] }).limit(5).select("name email role").lean(),
  ]);
  return [
    ...orders.map((o) => ({ kind: "order" as const, id: String(o._id), title: String(o._id), sub: `${o.contact.name} · ${o.status.replace("_", " ")} · ₹${Math.round(o.pricing.totalP / 100)}`, href: `/admin/orders/${o._id}` })),
    ...products.map((p) => ({ kind: "product" as const, id: String(p._id), title: p.name, sub: `${p.status} · ${p.variants.map((v) => v.sku).slice(0, 3).join(", ")}`, href: `/admin/products/${p._id}` })),
    ...customers.map((c) => ({ kind: "customer" as const, id: String(c._id), title: c.name || c.email, sub: user.role === "staff" ? (c.role ?? "customer") : `${c.email} · ${c.role ?? "customer"}`, href: `/admin/customers/${c._id}` })),
  ];
}
