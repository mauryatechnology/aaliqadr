import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { adminUser } from "@/server/admin/guard";
import { getEditorLookups, getProductEditor } from "@/server/admin/queries";
import { BLANK_PRODUCT } from "@/server/admin/product-form";
import { AdminSkeleton, Badge, PageHeader, STATUS_TONE } from "@/components/admin/ui";
import { ProductEditor } from "@/components/admin/product/ProductEditor";

export const metadata = { title: "Edit product" };

export default function Page(props: PageProps<"/admin/products/[id]">) {
  return (
    <Suspense fallback={<AdminSkeleton />}>
      <AdminProduct {...props} />
    </Suspense>
  );
}

async function AdminProduct({ params, searchParams }: PageProps<"/admin/products/[id]">) {
  const user = await adminUser("admin");
  if (!user) return <p className="text-sm text-neutral-600">Only admins can edit products.</p>;
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const isNew = id === "new";
  const [lookups, found] = await Promise.all([getEditorLookups(), isNew ? null : getProductEditor(id, { withCost: user.role === "owner" })]);
  if (!isNew && !found) notFound();

  // A new product may be pre-filed into a category (from the Categories page).
  const preCategory = typeof sp.category === "string" && lookups.categories.some((c) => c.id === sp.category) ? sp.category : "";
  const initial = found?.value ?? { ...BLANK_PRODUCT, categoryId: preCategory || (lookups.categories[0]?.id ?? "") };

  return (
    <>
      <Link href="/admin/products" className="mb-3 inline-flex items-center gap-1.5 text-sm text-neutral-600 hover:text-neutral-900"><ArrowLeft className="size-4" /> Products</Link>
      <PageHeader
        title={isNew ? "New product" : initial.name}
        description={isNew ? "Add the basics, photos and variants. Save as a draft until it's ready." : undefined}
        actions={!isNew ? <Badge tone={STATUS_TONE[initial.status]}>{initial.status}</Badge> : undefined}
      />
      <ProductEditor key={initial.id ?? "new"} initial={initial} isNew={isNew} lookups={lookups} showCost={user.role === "owner"} orderedSkus={found?.orderedSkus ?? []} draft={found?.draft ?? null} />
    </>
  );
}
