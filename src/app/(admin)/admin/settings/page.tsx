import Link from "next/link";
import { Suspense } from "react";
import { adminUser } from "@/server/admin/guard";
import { getSettings } from "@/server/services/settings";
import { site } from "@/config/site";
import { AdminSkeleton, Card, PageHeader } from "@/components/admin/ui";
import { StoreSettingsForm } from "@/components/admin/ops/SettingsForms";

export const metadata = { title: "Settings" };

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
  return (
    <>
      <PageHeader title="Settings" description="Prices are in rupees and include GST. Changes apply to new checkouts immediately." />
      <div className="flex flex-col gap-6">
        <StoreSettingsForm initial={{ giftWrap: s.giftWrapP / 100, reservationMinutes: s.reservationMinutes, returnWindowHours: s.returnWindowHours ?? 48 }} />
        <Card title="Business details (printed on invoices)">
          <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-1.5 text-sm">
            <dt className="text-neutral-500">Legal name</dt><dd>{site.legal.legalName}</dd>
            <dt className="text-neutral-500">GSTIN</dt><dd>{site.legal.gstin || <span className="text-amber-700">Not set: add it in src/config/site.ts before launch</span>}</dd>
            <dt className="text-neutral-500">Address</dt><dd>{site.legal.address}</dd>
          </dl>
        </Card>
        <p className="text-sm text-neutral-600">Delivery charges and cash on delivery are under <Link href="/admin/shipping" className="underline underline-offset-4">Shipping</Link>; team access under <Link href="/admin/staff" className="underline underline-offset-4">Staff & roles</Link>.</p>
      </div>
    </>
  );
}
