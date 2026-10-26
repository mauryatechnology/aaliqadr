import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { adminUser } from "@/server/admin/guard";
import { getPackingSlips } from "@/server/admin/queries";
import { PrintButton } from "@/components/orders/PrintButton";
import { PackingSlip } from "@/components/orders/PackingSlip";

export const metadata: Metadata = { title: "Packing slips", robots: { index: false, follow: false } };

/** Several packing slips in one print job, one per page (plan.md §4 bulk operations). Staff only. */
export default function PackingSlipsPage({ searchParams }: PageProps<"/packing-slips">) {
  return (
    <Suspense fallback={<p className="p-10">Loading…</p>}>
      <Slips searchParams={searchParams} />
    </Suspense>
  );
}

async function Slips({ searchParams }: Pick<PageProps<"/packing-slips">, "searchParams">) {
  const user = await adminUser();
  if (!user) notFound();
  const { ids } = await searchParams;
  const list = (typeof ids === "string" ? ids : "").split(",").filter((x) => /^AQ-\d{6,}$/.test(x)).slice(0, 100);
  const orders = await getPackingSlips(list);
  if (!orders.length) notFound();
  return (
    <main className="mx-auto max-w-2xl px-6 py-10 text-sm print:py-0">
      <div className="mb-6 flex items-center justify-between print:hidden">
        <p>{orders.length} packing slip{orders.length === 1 ? "" : "s"}</p>
        <PrintButton />
      </div>
      {orders.map((o) => (
        <section key={o._id} className="mb-16 break-after-page print:mb-0">
          <PackingSlip o={o} />
        </section>
      ))}
    </main>
  );
}
