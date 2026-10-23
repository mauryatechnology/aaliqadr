import Link from "next/link";
import type { Route } from "next";
import { Suspense } from "react";
import { Plus, Search } from "lucide-react";
import { hasRole } from "@/server/auth";
import { adminUser } from "@/server/admin/guard";
import { getEditorLookups, listCollectionsAdmin, listProductsAdmin, PAGE_SIZE, PRODUCT_SORTS, type ProductFilters, type ProductSort } from "@/server/admin/queries";
import { cn } from "@/lib/cn";
import { AdminSkeleton, btnPrimary, btnSecondary, Empty, inputCls, PageHeader } from "@/components/admin/ui";
import { ProductTable } from "@/components/admin/product/ProductTable";
import { ProductCsvTools } from "@/components/admin/product/ProductCsvTools";

export const metadata = { title: "Products" };

export default function Page(props: PageProps<"/admin/products">) {
  return (
    <Suspense fallback={<AdminSkeleton />}>
      <AdminProducts {...props} />
    </Suspense>
  );
}

const STATUS_TABS = [
  { key: "", label: "All" },
  { key: "active", label: "Active" },
  { key: "draft", label: "Draft" },
  { key: "archived", label: "Archived" },
] as const;

async function AdminProducts({ searchParams }: PageProps<"/admin/products">) {
  const user = await adminUser();
  if (!user) return null;
  const sp = await searchParams;
  const s = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : "");
  const filters: ProductFilters = {
    q: s("q").slice(0, 60),
    status: (["active", "draft", "archived"] as const).find((x) => x === s("status")),
    categoryId: s("category") || undefined,
    collectionId: s("collection") || undefined,
    stock: s("stock") === "out" || s("stock") === "low" ? (s("stock") as "out" | "low") : undefined,
    sort: (s("sort") in PRODUCT_SORTS ? s("sort") : "manual") as ProductSort,
    page: Math.max(1, Number(s("page")) || 1),
  };
  const [{ rows, total, statusCounts }, lookups, collections] = await Promise.all([listProductsAdmin(filters), getEditorLookups(), listCollectionsAdmin()]);
  const canEdit = hasRole(user, "admin");
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const all = Object.values(statusCounts).reduce((a, b) => a + b, 0);
  const href = (patch: Record<string, string | number | undefined>) => {
    const p = new URLSearchParams();
    const merged = { q: filters.q, status: filters.status, category: filters.categoryId, collection: filters.collectionId, stock: filters.stock, sort: filters.sort === "manual" ? undefined : filters.sort, page: undefined, ...patch };
    for (const [k, v] of Object.entries(merged)) if (v !== undefined && v !== "" && !(k === "page" && String(v) === "1")) p.set(k, String(v));
    const q = p.toString();
    return `/admin/products${q ? `?${q}` : ""}` as Route;
  };
  const filtered = !!(filters.q || filters.categoryId || filters.collectionId || filters.stock);

  return (
    <>
      <PageHeader
        title="Products"
        description={`${all} products. Drafts and archived products are hidden from the store.`}
        actions={
          canEdit ? (
            <>
              <ProductCsvTools />
              <Link href="/admin/products/new" className={btnPrimary}><Plus className="size-4" /> New product</Link>
            </>
          ) : undefined
        }
      />

      <nav aria-label="Status" className="mb-4 flex flex-wrap gap-1 border-b border-neutral-200">
        {STATUS_TABS.map((t) => {
          const on = (filters.status ?? "") === t.key;
          const n = t.key ? (statusCounts[t.key] ?? 0) : all;
          return (
            <Link key={t.key} href={href({ status: t.key || undefined })} aria-current={on ? "page" : undefined} className={cn("-mb-px border-b-2 px-3 py-2 text-sm font-medium", on ? "border-neutral-900 text-neutral-900" : "border-transparent text-neutral-600 hover:text-neutral-900")}>
              {t.label} <span className="ml-1 rounded-full bg-neutral-100 px-1.5 text-xs text-neutral-600">{n}</span>
            </Link>
          );
        })}
      </nav>

      <form action="/admin/products" className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-[minmax(0,2fr)_repeat(4,minmax(0,1fr))_auto]">
        {filters.status && <input type="hidden" name="status" value={filters.status} />}
        <label className="relative">
          <span className="sr-only">Search</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400" aria-hidden />
          <input name="q" defaultValue={filters.q} placeholder="Name, SKU, URL or tag" className={`${inputCls} pl-9`} />
        </label>
        <select name="category" defaultValue={filters.categoryId ?? ""} aria-label="Category" className={inputCls}>
          <option value="">All categories</option>
          {lookups.categories.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
        </select>
        <select name="collection" defaultValue={filters.collectionId ?? ""} aria-label="Collection" className={inputCls}>
          <option value="">All collections</option>
          {collections.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select name="stock" defaultValue={filters.stock ?? ""} aria-label="Stock" className={inputCls}>
          <option value="">Any stock</option>
          <option value="low">Low stock</option>
          <option value="out">Out of stock</option>
        </select>
        <select name="sort" defaultValue={filters.sort} aria-label="Sort" className={inputCls}>
          {(Object.keys(PRODUCT_SORTS) as ProductSort[]).map((k) => <option key={k} value={k}>{PRODUCT_SORTS[k].label}</option>)}
        </select>
        <div className="flex gap-2">
          <button type="submit" className={btnSecondary}>Apply</button>
          {filtered && <Link href={href({ q: undefined, category: undefined, collection: undefined, stock: undefined })} className="inline-flex h-10 items-center px-2 text-sm text-neutral-600 hover:text-neutral-900">Reset</Link>}
        </div>
      </form>

      {rows.length === 0 ? (
        <Empty title={filtered || filters.status ? "No products match" : "No products yet"}>
          {filtered || filters.status ? "Try a different search or filter." : canEdit ? <Link href="/admin/products/new" className="underline underline-offset-4">Create your first product</Link> : null}
        </Empty>
      ) : (
        <ProductTable
          canEdit={canEdit}
          rows={rows.map((p) => {
            const active = p.variants.filter((v) => v.isActive);
            const prices = active.map((v) => v.priceP);
            return {
              id: p.id,
              name: p.name,
              slug: p.slug,
              status: p.status,
              category: p.category,
              image: p.media.find((m) => m.kind === "image")?.url,
              sign: p.zodiacSign,
              variants: p.variants.length,
              minP: prices.length ? Math.min(...prices) : 0,
              maxP: prices.length ? Math.max(...prices) : 0,
              stock: active.reduce((n, v) => n + v.stock, 0),
              low: active.some((v) => v.stock <= v.lowStockThreshold),
              badges: p.badges,
            };
          })}
        />
      )}

      {pages > 1 && (
        <nav aria-label="Pages" className="mt-4 flex items-center justify-between text-sm">
          <span className="text-neutral-600">{(filters.page - 1) * PAGE_SIZE + 1}–{Math.min(filters.page * PAGE_SIZE, total)} of {total}</span>
          <div className="flex gap-2">
            {filters.page > 1 && <Link className={btnSecondary} href={href({ page: filters.page - 1 })}>Previous</Link>}
            {filters.page < pages && <Link className={btnSecondary} href={href({ page: filters.page + 1 })}>Next</Link>}
          </div>
        </nav>
      )}
    </>
  );
}
