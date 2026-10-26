import Link from "next/link";
import type { Route } from "next";
import { Suspense } from "react";
import { Plus, Table2 } from "lucide-react";
import { SIGNS } from "@/config/zodiac";
import { listQuery, nextSort, parseList } from "@/lib/list-params";
import { hasRole } from "@/server/auth";
import { adminUser } from "@/server/admin/guard";
import { getEditorLookups, listCollectionsAdmin } from "@/server/admin/queries";
import { listProductsPaged } from "@/server/admin/lists";
import { LIST_SPECS } from "@/server/admin/list-kinds";
import { BADGES, TYPE_LABEL } from "@/server/catalog/types";
import { AdminSkeleton, btnPrimary, btnSecondary, Empty, PageHeader } from "@/components/admin/ui";
import { ListTabs, Pagination } from "@/components/admin/kit/DataTable";
import { ListToolbar } from "@/components/admin/kit/ListToolbar";
import { ProductTable } from "@/components/admin/product/ProductTable";
import { ProductCsvTools } from "@/components/admin/product/ProductCsvTools";

export const metadata = { title: "Products" };

const spec = LIST_SPECS.products;
const BASE = "/admin/products";

export default function Page(props: PageProps<"/admin/products">) {
  return (
    <Suspense fallback={<AdminSkeleton />}>
      <AdminProducts {...props} />
    </Suspense>
  );
}

async function AdminProducts({ searchParams }: PageProps<"/admin/products">) {
  const user = await adminUser();
  if (!user) return null;
  const state = parseList(await searchParams, spec);
  const [{ rows, total, statusCounts }, lookups, collections] = await Promise.all([listProductsPaged(state), getEditorLookups(), listCollectionsAdmin()]);
  const canEdit = hasRole(user, "admin");
  const all = Object.values(statusCounts).reduce((a, b) => a + b, 0);
  const href = (patch: Parameters<typeof listQuery>[2]) => `${BASE}${listQuery(state, spec, patch)}` as Route;
  const sortHead = (key: string) => ({ href: href(nextSort(state, spec, key)), dir: state.sort === key ? state.dir : undefined });
  const filtered = !!(state.q || Object.keys(state.f).some((k) => k !== "status"));
  const pages = Math.max(1, Math.ceil(total / state.size));

  return (
    <>
      <PageHeader
        title="Products"
        description={`${all} products. Drafts and archived products are hidden from the store.`}
        actions={
          canEdit ? (
            <>
              <ProductCsvTools />
              <Link href="/admin/products/bulk" className={btnSecondary}><Table2 className="size-4" /> Bulk edit</Link>
              <Link href="/admin/products/new" className={btnPrimary}><Plus className="size-4" /> New product</Link>
            </>
          ) : undefined
        }
      />
      <ListTabs
        base={BASE}
        spec={spec}
        state={state}
        filter="status"
        tabs={[
          { value: "", label: "All", count: all },
          { value: "active", label: "Active", count: statusCounts.active ?? 0 },
          { value: "draft", label: "Draft", count: statusCounts.draft ?? 0 },
          { value: "archived", label: "Archived", count: statusCounts.archived ?? 0 },
        ]}
      />
      <ListToolbar
        placeholder="Name, SKU, URL, tag or barcode"
        exportKind="products"
        sorts={[{ value: "name", label: "Name" }, { value: "newest", label: "Newest" }, { value: "updated", label: "Edited" }, { value: "bestselling", label: "Best-selling" }, { value: "price", label: "Price" }, { value: "stock", label: "Stock" }]}
        filters={[
          { key: "category", label: "Category", options: lookups.categories.map((c) => ({ value: c.id, label: c.label })) },
          { key: "collection", label: "Collection", options: collections.map((c) => ({ value: c.id, label: c.name })) },
          { key: "type", label: "Type", type: "multi", options: Object.entries(TYPE_LABEL).map(([value, label]) => ({ value, label })) },
          { key: "sign", label: "Sign", type: "multi", options: SIGNS.map((s) => ({ value: s.slug, label: s.name })) },
          { key: "stock", label: "Stock", options: [{ value: "low", label: "Low stock" }, { value: "out", label: "Out of stock" }] },
          { key: "badge", label: "Badge", type: "multi", options: Object.entries(BADGES).map(([value, label]) => ({ value, label })) },
          { key: "photos", label: "Photos", options: [{ value: "yes", label: "Has real photos" }, { value: "no", label: "Bottle art only" }] },
        ]}
      />

      {rows.length === 0 ? (
        <Empty title={filtered || state.f.status ? "No products match" : "No products yet"} action={canEdit && !filtered ? <Link href="/admin/products/new" className={btnPrimary}><Plus className="size-4" /> Create a product</Link> : undefined}>
          {filtered || state.f.status ? "Try a different search or clear the filters." : null}
        </Empty>
      ) : (
        <div className="flex flex-col gap-3">
          <ProductTable
            canEdit={canEdit}
            sort={{ name: sortHead("name"), price: sortHead("price"), stock: sortHead("stock") }}
            lookups={{ categories: lookups.categories.map((c) => ({ id: c.id, label: c.label })), collections: lookups.collections.map((c) => ({ id: c.id, name: c.name })) }}
            rows={rows}
          />
          <Pagination total={total} from={(state.page - 1) * state.size + 1} to={Math.min(total, state.page * state.size)} page={state.page} pages={pages} size={state.size} href={href} />
        </div>
      )}
    </>
  );
}
