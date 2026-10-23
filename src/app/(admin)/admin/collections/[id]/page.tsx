import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { adminUser } from "@/server/admin/guard";
import { getCollectionAdmin, listCategoriesAdmin, listProductPicker } from "@/server/admin/queries";
import type { CollectionInput } from "@/schemas/product";
import { AdminSkeleton, PageHeader } from "@/components/admin/ui";
import { CollectionEditor } from "@/components/admin/catalog/CollectionEditor";

export const metadata = { title: "Collection" };

export default function Page(props: PageProps<"/admin/collections/[id]">) {
  return (
    <Suspense fallback={<AdminSkeleton />}>
      <AdminCollection {...props} />
    </Suspense>
  );
}

async function AdminCollection({ params }: PageProps<"/admin/collections/[id]">) {
  const user = await adminUser("admin");
  if (!user) return <p className="text-sm text-neutral-600">Only admins can manage collections.</p>;
  const { id } = await params;
  const isNew = id === "new";
  const [found, products, categories] = await Promise.all([isNew ? null : getCollectionAdmin(id), listProductPicker(), listCategoriesAdmin()]);
  if (!isNew && !found) notFound();
  const initial: CollectionInput = found
    ? { id: found.id, name: found.name, slug: found.slug, description: found.description, kind: found.kind, productIds: found.productIds, rules: found.rules, image: found.image, banner: found.banner, featured: found.featured, sortOrder: found.sortOrder, isActive: found.isActive, seoTitle: found.seo.title ?? "", seoDescription: found.seo.description ?? "" }
    : { name: "", slug: "", description: "", kind: "manual", productIds: [], rules: { match: "all", conditions: [] }, featured: false, sortOrder: 50, isActive: true, seoTitle: "", seoDescription: "" };
  return (
    <>
      <Link href="/admin/collections" className="mb-3 inline-flex items-center gap-1.5 text-sm text-neutral-600 hover:text-neutral-900"><ArrowLeft className="size-4" /> Collections</Link>
      <PageHeader title={isNew ? "New collection" : initial.name} />
      <CollectionEditor key={initial.id ?? "new"} initial={initial} isNew={isNew} products={products} categories={categories.map((c) => ({ slug: c.slug, label: `${"— ".repeat(c.depth)}${c.name}` }))} />
    </>
  );
}
