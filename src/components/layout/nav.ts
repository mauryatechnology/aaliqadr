import type { Route } from "next";
import { routes } from "@/lib/routes";

export const MAIN_NAV: { href: Route; label: string }[] = [
  { href: "/zodiac", label: "The Zodiac" },
  { href: "/shop", label: "Shop" },
  { href: routes.product("zodiac-discovery-coffret"), label: "Discovery Coffret" },
  { href: "/find-my-sign", label: "Find My Sign" },
  { href: "/about", label: "Our Craft" },
];

export const POLICY_NAV: { href: Route; label: string }[] = [
  { href: routes.policy("shipping"), label: "Shipping" },
  { href: routes.policy("returns"), label: "Returns & Refunds" },
  { href: routes.policy("privacy"), label: "Privacy" },
  { href: routes.policy("terms"), label: "Terms" },
  { href: routes.policy("grievance"), label: "Grievance Redressal" },
];
