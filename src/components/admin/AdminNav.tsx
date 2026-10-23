"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Route } from "next";
import { useState } from "react";
import {
  BarChart3,
  Boxes,
  FileText,
  FolderTree,
  LayoutDashboard,
  Layers,
  Menu,
  MessageSquare,
  Megaphone,
  Package,
  Percent,
  ReceiptText,
  RotateCcw,
  Settings,
  ShieldCheck,
  ShoppingBag,
  Tag,
  Truck,
  Users,
  X,
} from "lucide-react";
import { cn } from "@/lib/cn";

type Item = { href: string; label: string; Icon: typeof Boxes; min?: "admin" | "owner"; badge?: number };

const GROUPS = (badges: AdminBadges): { title?: string; items: Item[] }[] => [
  {
    items: [
      { href: "/admin", label: "Dashboard", Icon: LayoutDashboard },
      { href: "/admin/orders", label: "Orders", Icon: ShoppingBag, badge: badges.toShip },
      { href: "/admin/returns", label: "Returns & claims", Icon: RotateCcw, badge: badges.returns },
    ],
  },
  {
    title: "Catalogue",
    items: [
      { href: "/admin/products", label: "Products", Icon: Package },
      { href: "/admin/categories", label: "Categories", Icon: FolderTree, min: "admin" },
      { href: "/admin/collections", label: "Collections", Icon: Layers, min: "admin" },
      { href: "/admin/inventory", label: "Inventory", Icon: Boxes },
      { href: "/admin/hsn", label: "HSN codes", Icon: Percent, min: "admin" },
    ],
  },
  {
    title: "Customers",
    items: [
      { href: "/admin/customers", label: "Customers", Icon: Users },
      { href: "/admin/reviews", label: "Reviews", Icon: MessageSquare, badge: badges.reviews },
    ],
  },
  {
    title: "Storefront",
    items: [
      { href: "/admin/content", label: "Content", Icon: Megaphone, min: "admin" },
      { href: "/admin/coupons", label: "Coupons", Icon: Tag, min: "admin" },
      { href: "/admin/shipping", label: "Shipping", Icon: Truck, min: "admin" },
    ],
  },
  {
    title: "Finance",
    items: [
      { href: "/admin/invoices", label: "Invoices", Icon: ReceiptText, min: "admin" },
      { href: "/admin/reports", label: "Reports & GST", Icon: BarChart3, min: "admin" },
    ],
  },
  {
    title: "Settings",
    items: [
      { href: "/admin/staff", label: "Staff & roles", Icon: ShieldCheck, min: "owner" },
      { href: "/admin/settings", label: "Settings", Icon: Settings, min: "admin" },
      { href: "/admin/audit", label: "Activity log", Icon: FileText, min: "admin" },
    ],
  },
];

const RANK = { staff: 1, admin: 2, owner: 3 } as const;

export interface AdminBadges {
  toShip: number;
  returns: number;
  reviews: number;
}

export function AdminNav({ role, badges = { toShip: 0, returns: 0, reviews: 0 } }: { role: "staff" | "admin" | "owner"; badges?: AdminBadges }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const groups = GROUPS(badges)
    .map((g) => ({ ...g, items: g.items.filter((n) => !n.min || RANK[role] >= RANK[n.min]) }))
    .filter((g) => g.items.length);
  const isActive = (href: string) => (href === "/admin" ? pathname === "/admin" : pathname.startsWith(href));

  const list = (
    <div className="flex flex-col gap-4">
      {groups.map((g, i) => (
        <div key={g.title ?? i}>
          {g.title && <p className="mb-1 px-3 text-[11px] font-semibold uppercase tracking-wider text-neutral-500">{g.title}</p>}
          <ul className="flex flex-col gap-0.5">
            {g.items.map(({ href, label, Icon, badge }) => (
              <li key={href}>
                <Link
                  href={href as Route}
                  onClick={() => setOpen(false)}
                  aria-current={isActive(href) ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                    isActive(href) ? "bg-neutral-900 text-white" : "text-neutral-700 hover:bg-neutral-200/70 hover:text-neutral-900",
                  )}
                >
                  <Icon className="size-4" aria-hidden /> <span className="flex-1">{label}</span>
                  {badge ? <span className={cn("rounded-full px-1.5 text-xs tabular-nums", isActive(href) ? "bg-white/20" : "bg-amber-100 text-amber-900")}>{badge}</span> : null}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
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
          <nav aria-label="Admin" className="absolute inset-x-4 z-30 mt-2 max-h-[75dvh] overflow-y-auto rounded-xl border border-neutral-200 bg-white p-3 shadow-lg">
            {list}
          </nav>
        )}
      </div>
    </>
  );
}
