import type { Route } from "next";
import type { ZodiacSlug } from "@/config/zodiac";

/**
 * Typed builders for dynamic URLs. `typedRoutes` checks string literals, but not values
 * computed at runtime, so every dynamic link goes through here.
 */
export const routes = {
  product: (slug: string) => `/perfume/${slug}` as Route,
  sign: (sign: ZodiacSlug) => `/zodiac/${sign}` as Route,
  policy: (policy: "shipping" | "returns" | "privacy" | "terms" | "grievance") => `/policies/${policy}` as Route,
  login: (next?: string) => (next ? `/login?next=${encodeURIComponent(next)}` : "/login") as Route,
  order: (id: string, key?: string) => (key ? `/order/${id}?k=${encodeURIComponent(key)}` : `/order/${id}`) as Route,
  accountOrder: (id: string) => `/account/orders/${id}` as Route,
  invoice: (id: string, key?: string) => (key ? `/invoice/${id}?k=${encodeURIComponent(key)}` : `/invoice/${id}`) as Route,
  adminOrder: (id: string) => `/admin/orders/${id}` as Route,
  packingSlip: (id: string) => `/packing-slip/${id}` as Route,
  adminProduct: (id: string) => `/admin/products/${id}` as Route,
};
