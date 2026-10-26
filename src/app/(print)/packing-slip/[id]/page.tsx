import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { adminUser } from "@/server/admin/guard";
import { getAdminOrder } from "@/server/admin/queries";
import { PrintButton } from "@/components/orders/PrintButton";
import { PackingSlip } from "@/components/orders/PackingSlip";

export const metadata: Metadata = { title: "Packing slip", robots: { index: false, follow: false } };

/** Goes in the parcel: no prices, ever (gift orders are common for perfume). Staff only. */
export default function PackingSlipPage({ params }: PageProps<"/packing-slip/[id]">) {
  return (
    <Suspense fallback={<p className="p-10">Loading…</p>}>
      <Slip params={params} />
    </Suspense>
  );
}

async function Slip({ params }: Pick<PageProps<"/packing-slip/[id]">, "params">) {
  const user = await adminUser();
  if (!user) notFound();
  const { id } = await params;
  const data = await getAdminOrder(id);
  if (!data) notFound();
  return (
    <main className="mx-auto max-w-2xl px-6 py-10 text-sm print:py-0">
      <div className="mb-6 flex justify-end print:hidden">
        <PrintButton />
      </div>
      <PackingSlip o={data.order} />
    </main>
  );
}
