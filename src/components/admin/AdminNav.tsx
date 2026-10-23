"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Route } from "next";
import { useState } from "react";
import { Boxes, LayoutDashboard, Menu, Package, Settings, ShoppingBag, Tag, Users, X } from "lucide-react";
import { cn } from "@/lib/cn";

const NAV: { href: Route; label: string; Icon: typeof Boxes; min?: "admin" | "owner" }[] = [
  { href: "/admin", label: "Dashboard", Icon: LayoutDashboard },
  { href: "/admin/orders", label: "Orders", Icon: ShoppingBag },
  { href: "/admin/products", label: "Products", Icon: Package },
  { href: "/admin/inventory", label: "Inventory", Icon: Boxes },
  { href: "/admin/customers", label: "Customers", Icon: Users },
  { href: "/admin/coupons", label: "Coupons", Icon: Tag, min: "admin" },
  { href: "/admin/settings", label: "Settings", Icon: Settings, min: "admin" },
];

const RANK = { staff: 1, admin: 2, owner: 3 } as const;

export function AdminNav({ role }: { role: "staff" | "admin" | "owner" }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const items = NAV.filter((n) => !n.min || RANK[role] >= RANK[n.min]);
  const isActive = (href: string) => (href === "/admin" ? pathname === "/admin" : pathname.startsWith(href));

  const list = (
    <ul className="flex flex-col gap-0.5">
      {items.map(({ href, label, Icon }) => (
        <li key={href}>
          <Link
            href={href}
            onClick={() => setOpen(false)}
            aria-current={isActive(href) ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              isActive(href) ? "bg-neutral-900 text-white" : "text-neutral-700 hover:bg-neutral-200/70 hover:text-neutral-900",
            )}
          >
            <Icon className="size-4" aria-hidden /> {label}
          </Link>
        </li>
      ))}
    </ul>
  );

  return (
    <>
      <nav aria-label="Admin" className="hidden lg:block">
        {list}
      </nav>
      <div className="lg:hidden">
        <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} className="flex h-10 items-center gap-2 rounded-lg border border-neutral-300 bg-white px-3 text-sm font-medium">
          {open ? <X className="size-4" /> : <Menu className="size-4" />} Menu
        </button>
        {open && (
          <nav aria-label="Admin" className="mt-2 rounded-xl border border-neutral-200 bg-white p-2 shadow-lg">
            {list}
          </nav>
        )}
      </div>
    </>
  );
}
