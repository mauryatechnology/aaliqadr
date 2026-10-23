import { Suspense } from "react";
import { adminUser } from "@/server/admin/guard";
import { listHsnAdmin } from "@/server/admin/queries";
import { AdminSkeleton, PageHeader } from "@/components/admin/ui";
import { HsnManager } from "@/components/admin/catalog/HsnManager";

export const metadata = { title: "HSN codes" };

export default function Page() {
  return (
    <Suspense fallback={<AdminSkeleton />}>
      <AdminHsn />
    </Suspense>
  );
}

async function AdminHsn() {
  const user = await adminUser("admin");
  if (!user) return <p className="text-sm text-neutral-600">Only admins can manage HSN codes.</p>;
  const rows = await listHsnAdmin();
  return (
    <>
      <PageHeader title="HSN codes" description="The tax classifications products can use. A product's GST rate comes from its HSN code." />
      <HsnManager rows={rows} />
    </>
  );
}
