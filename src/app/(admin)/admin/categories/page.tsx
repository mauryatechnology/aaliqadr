import { Suspense } from "react";
import { parseList, type ListSpec } from "@/lib/list-params";
import { adminUser } from "@/server/admin/guard";
import { listCategoriesAdmin } from "@/server/admin/queries";
import { AdminSkeleton, PageHeader } from "@/components/admin/ui";
import { ListToolbar } from "@/components/admin/kit/ListToolbar";
import { CategoryManager } from "@/components/admin/catalog/CategoryManager";

export const metadata = { title: "Categories" };

const spec: ListSpec = { sorts: ["tree", "name", "products"], defaultSort: "tree", defaultDir: "asc", filters: ["visible"] };

export default function Page(props: PageProps<"/admin/categories">) {
  return (
    <Suspense fallback={<AdminSkeleton />}>
      <AdminCategories {...props} />
    </Suspense>
  );
}

async function AdminCategories({ searchParams }: PageProps<"/admin/categories">) {
  const user = await adminUser("admin");
  if (!user) return <p className="text-sm text-neutral-600">Only admins can manage categories.</p>;
  const s = parseList(await searchParams, spec);
  const all = await listCategoriesAdmin();
  const q = s.q.toLowerCase();
  const hit = (c: (typeof all)[number]) => (!q || c.name.toLowerCase().includes(q) || c.slug.includes(q)) && (!s.f.visible || (s.f.visible[0] === "yes") === c.isActive);
  // In tree order a match keeps its ancestors, so it still shows where it sits.
  const byId = new Map(all.map((c) => [c.id, c]));
  const keep = new Set<string>();
  for (const c of all.filter(hit)) for (let x: (typeof all)[number] | undefined = c; x && !keep.has(x.id); x = x.parentId ? byId.get(x.parentId) : undefined) keep.add(x.id);
  const d = s.dir === "asc" ? 1 : -1;
  const rows =
    s.sort === "tree"
      ? all.filter((c) => keep.has(c.id))
      : all.filter(hit).map((c) => ({ ...c, depth: 0 })).toSorted((a, b) => d * (s.sort === "products" ? a.products - b.products : a.name.localeCompare(b.name)));
  return (
    <>
      <PageHeader title="Categories" description="Every product belongs to one category. Categories nest, and each has its own page in the store." />
      <ListToolbar
        placeholder="Name or URL"
        sortAlways
        sorts={[{ value: "name", label: "Name" }, { value: "products", label: "Products" }]}
        filters={[{ key: "visible", label: "Visibility", options: [{ value: "yes", label: "Visible" }, { value: "no", label: "Hidden" }] }]}
      />
      <CategoryManager rows={rows} />
    </>
  );
}
