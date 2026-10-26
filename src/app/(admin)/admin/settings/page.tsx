import Link from "next/link";
import { Suspense } from "react";
import { adminUser } from "@/server/admin/guard";
import { businessOf, getSettings } from "@/server/services/settings";
import { hasRole } from "@/server/auth";
import { AdminSkeleton, Card, PageHeader } from "@/components/admin/ui";
import { BusinessForm, StoreSettingsForm } from "@/components/admin/ops/SettingsForms";

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
  const b = businessOf(s);
  return (
    <>
      <PageHeader title="Settings" description="Prices are in rupees and include GST. Changes apply to new checkouts immediately." />
      <div className="flex flex-col gap-6">
        <StoreSettingsForm initial={{ giftWrap: s.giftWrapP / 100, reservationMinutes: s.reservationMinutes, returnWindowHours: s.returnWindowHours ?? 48, qaEnabled: !!s.qaEnabled }} />
        {hasRole(user, "owner") ? (
          <BusinessForm initial={{ legalName: b.legalName, address: b.address, city: b.city, stateCode: b.stateCode, gstin: b.gstin, supportPhone: b.supportPhone, supportEmail: b.supportEmail }} />
        ) : (
          <Card title="Business details (printed on invoices)">
            <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-1.5 text-sm">
              <dt className="text-neutral-500">Legal name</dt><dd>{b.legalName}</dd>
              <dt className="text-neutral-500">GSTIN</dt><dd>{b.gstin || <span className="text-amber-700">Not set yet (the owner can add it here)</span>}</dd>
              <dt className="text-neutral-500">Address</dt><dd>{b.address}</dd>
            </dl>
          </Card>
        )}
        <p className="text-sm text-neutral-600">Delivery charges and cash on delivery are under <Link href="/admin/shipping" className="underline underline-offset-4">Shipping</Link>; team access under <Link href="/admin/staff" className="underline underline-offset-4">Staff & roles</Link>.</p>
      </div>
    </>
  );
}
