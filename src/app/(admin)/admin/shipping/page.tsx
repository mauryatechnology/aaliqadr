import { Suspense } from "react";
import { adminUser } from "@/server/admin/guard";
import { getSettings } from "@/server/services/settings";
import { AdminSkeleton, PageHeader } from "@/components/admin/ui";
import { ShippingForm } from "@/components/admin/ops/SettingsForms";

export const metadata = { title: "Shipping" };

export default function Page() {
  return (
    <Suspense fallback={<AdminSkeleton />}>
      <AdminShipping />
    </Suspense>
  );
}

async function AdminShipping() {
  const user = await adminUser("admin");
  if (!user) return <p className="text-sm text-neutral-600">Only admins can change shipping.</p>;
  const s = await getSettings();
  return (
    <>
      <PageHeader title="Shipping" description="Charges are by parcel weight (each variant's packed weight) and waived above the free-shipping amount." />
      <ShippingForm
        initial={{
          freeShippingAbove: s.freeShippingAboveP / 100,
          slabs: s.shippingSlabs.map((x) => ({ uptoG: x.uptoG, price: x.priceP / 100 })),
          extraPer500g: s.extraPer500gP / 100,
          codEnabled: s.codEnabled,
          codMaxOrder: s.codMaxOrderP / 100,
          codFee: s.codFeeP / 100,
        }}
      />
    </>
  );
}
