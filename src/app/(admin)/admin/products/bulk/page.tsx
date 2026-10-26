import Link from "next/link";
import { Suspense } from "react";
import { ArrowLeft } from "lucide-react";
import { adminUser } from "@/server/admin/guard";
import { getEditorLookups, listBulkEdit } from "@/server/admin/queries";
import { AdminSkeleton, PageHeader } from "@/components/admin/ui";
import { BulkEditor } from "@/components/admin/product/BulkEditor";

export const metadata = { title: "Bulk edit products" };

export default function Page() {
  return (
    <Suspense fallback={<AdminSkeleton />}>
      <Bulk />
    </Suspense>
  );
}

async function Bulk() {
  const user = await adminUser("admin");
  if (!user) return <p className="text-sm text-neutral-600">Only admins can edit products.</p>;
  const [rows, lookups] = await Promise.all([listBulkEdit(), getEditorLookups()]);
  return (
    <>
      <Link href="/admin/products" className="mb-3 inline-flex items-center gap-1.5 text-sm text-neutral-600 hover:text-neutral-900"><ArrowLeft className="size-4" /> Products</Link>
      <PageHeader title="Bulk edit" description="Prices, status and category for many products at once. Each product is saved like it would be in its editor, so going live still needs the publish checklist. For very large changes, use CSV import." />
      <BulkEditor rows={rows} categories={lookups.categories.map((c) => ({ id: c.id, label: c.label }))} />
    </>
  );
}
