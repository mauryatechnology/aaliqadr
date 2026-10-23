import { adminUser } from "@/server/admin/guard";
import { Suspense } from "react";
import { getSettings } from "@/server/services/settings";
import { AdminSkeleton, Card, PageHeader } from "@/components/admin/ui";
import { SettingsForm } from "@/components/admin/AdminForms";

export const metadata = { title: "Settings" };

const r = (p: number) => p / 100;

export default function Page() {
  return (
    <Suspense fallback={<AdminSkeleton />}>
      <AdminSettings />
    </Suspense>
  );
}

async function AdminSettings() {
  const user = await adminUser("admin");
  if (!user) return <p className="text-sm text-neutral-600">Only admins can change settings.</p>;
  const s = await getSettings();
  const [a, b] = s.shippingSlabs;
  return (
    <>
      <PageHeader title="Settings" description="Prices are in rupees and include GST. Changes apply to new checkouts immediately." />
      <Card>
        <SettingsForm
          values={{
            freeShippingAbove: r(s.freeShippingAboveP),
            slab1UptoG: a?.uptoG ?? 500,
            slab1Price: r(a?.priceP ?? 7900),
            slab2UptoG: b?.uptoG ?? 1000,
            slab2Price: r(b?.priceP ?? 9900),
            extraPer500g: r(s.extraPer500gP),
            codEnabled: s.codEnabled,
            codMaxOrder: r(s.codMaxOrderP),
            codFee: r(s.codFeeP),
            giftWrap: r(s.giftWrapP),
            reservationMinutes: s.reservationMinutes,
          }}
        />
      </Card>
    </>
  );
}
