import { Suspense } from "react";
import { adminUser } from "@/server/admin/guard";
import { listCategoriesAdmin } from "@/server/admin/queries";
import { AdminSkeleton, PageHeader } from "@/components/admin/ui";
import { CategoryManager } from "@/components/admin/catalog/CategoryManager";

export const metadata = { title: "Categories" };

export default function Page() {
  return (
    <Suspense fallback={<AdminSkeleton />}>
      <AdminCategories />
    </Suspense>
  );
}

async function AdminCategories() {
  const user = await adminUser("admin");
  if (!user) return <p className="text-sm text-neutral-600">Only admins can manage categories.</p>;
  const rows = await listCategoriesAdmin();
  return (
    <>
      <PageHeader title="Categories" description="Every product belongs to one category. Categories nest, and each has its own page in the store." />
      <CategoryManager rows={rows} />
    </>
  );
}
