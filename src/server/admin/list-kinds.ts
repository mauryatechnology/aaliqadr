import type { ListSpec } from "@/lib/list-params";

/**
 * The admin lists and what each accepts in its URL (plan.md §3). Pure, so the client toolbar
 * and the server queries share it.
 */

export const LIST_SPECS = {
  orders: { sorts: ["date", "total", "status"], filters: ["status", "pay", "paid", "from", "to", "state", "coupon", "sign"] },
  products: { sorts: ["manual", "name", "newest", "updated", "bestselling", "price", "stock"], defaultSort: "manual", defaultDir: "asc", filters: ["status", "category", "collection", "type", "sign", "stock", "badge", "photos"] },
  inventory: { sorts: ["name", "stock", "reserved"], defaultSort: "name", defaultDir: "asc", filters: ["category", "status", "stock", "active"] },
  ledger: { sorts: ["date"], filters: ["type", "from", "to"] },
  customers: { sorts: ["joined", "orders", "spent", "last"], filters: ["role", "buyer", "from", "to", "claim"] },
  returns: { sorts: ["date", "value"], filters: ["status", "reason", "resolution", "from", "to"] },
  reviews: { sorts: ["date", "rating"], filters: ["status", "rating", "verified", "photos"] },
  coupons: { sorts: ["created", "ends", "uses"], filters: ["state", "kind"] },
  invoices: { sorts: ["date", "total"], filters: ["fy", "from", "to", "supply", "state"] },
  audit: { sorts: ["date"], filters: ["kind", "role", "from", "to"] },
} as const satisfies Record<string, ListSpec>;

export type ListKind = keyof typeof LIST_SPECS;
export const listSpec = (k: ListKind): ListSpec => LIST_SPECS[k];
