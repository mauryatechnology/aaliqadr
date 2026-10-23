import { formatPrice } from "@/lib/money";
import { Suspense } from "react";
import { adminUser } from "@/server/admin/guard";
import { listCoupons } from "@/server/admin/queries";
import { AdminSkeleton, Badge, Card, Empty, PageHeader, Table, td, th } from "@/components/admin/ui";
import { adminDay } from "@/components/admin/format";
import { CouponForm, CouponToggle } from "@/components/admin/AdminForms";

export const metadata = { title: "Coupons" };

export default function Page() {
  return (
    <Suspense fallback={<AdminSkeleton />}>
      <AdminCoupons />
    </Suspense>
  );
}

async function AdminCoupons() {
  const user = await adminUser("admin");
  if (!user) return <p className="text-sm text-neutral-600">Only admins can manage coupons.</p>;
  const coupons = await listCoupons();
  const now = new Date();
  return (
    <>
      <PageHeader title="Coupons" description="One code per order. Discounts apply before GST and are shared across items." />
      <Card title="New coupon" className="mb-6"><CouponForm /></Card>
      {coupons.length === 0 ? <Empty title="No coupons yet" /> : (
        <Table>
          <thead><tr><th className={th}>Code</th><th className={th}>Offer</th><th className={th}>Valid</th><th className={`${th} text-right`}>Used</th><th className={th}>Status</th><th className={th} /></tr></thead>
          <tbody>
            {coupons.map((c) => {
              const live = c.isActive && now >= new Date(c.startsAt) && now <= new Date(c.endsAt);
              return (
                <tr key={c.code}>
                  <td className={td}><span className="font-mono font-medium">{c.code}</span>{c.description && <span className="block text-xs text-neutral-500">{c.description}</span>}</td>
                  <td className={td}>{c.kind === "percent" ? `${c.valueBps / 100}% off` : c.kind === "flat" ? `${formatPrice(c.valueP)} off` : "Free shipping"}{c.maxDiscountP > 0 && ` (max ${formatPrice(c.maxDiscountP)})`}{c.minSubtotalP > 0 && <span className="block text-xs text-neutral-500">on {formatPrice(c.minSubtotalP)}+</span>}</td>
                  <td className={`${td} text-xs`}>{adminDay.format(new Date(c.startsAt))} – {adminDay.format(new Date(c.endsAt))}</td>
                  <td className={`${td} text-right tabular-nums`}>{c.usedCount}{c.usageLimit > 0 && ` / ${c.usageLimit}`}</td>
                  <td className={td}><Badge tone={live ? "green" : c.isActive ? "amber" : "neutral"}>{live ? "Live" : c.isActive ? "Scheduled / ended" : "Paused"}</Badge></td>
                  <td className={td}><CouponToggle code={c.code} active={c.isActive} /></td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      )}
    </>
  );
}
