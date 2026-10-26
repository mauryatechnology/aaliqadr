import { Suspense } from "react";
import { formatPrice } from "@/lib/money";
import { parseList } from "@/lib/list-params";
import { adminUser } from "@/server/admin/guard";
import { listCouponsPaged } from "@/server/admin/lists";
import { LIST_SPECS } from "@/server/admin/list-kinds";
import { AdminSkeleton, Badge, Empty, PageHeader } from "@/components/admin/ui";
import { adminDay } from "@/components/admin/format";
import { DataTable, type Column } from "@/components/admin/kit/DataTable";
import { ListToolbar } from "@/components/admin/kit/ListToolbar";
import { CouponToggle } from "@/components/admin/AdminForms";
import { CouponRowActions, NewCouponButton } from "@/components/admin/ops/CouponTools";

export const metadata = { title: "Coupons" };

const spec = LIST_SPECS.coupons;
const istDate = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(d);

export default function Page(props: PageProps<"/admin/coupons">) {
  return (
    <Suspense fallback={<AdminSkeleton />}>
      <AdminCoupons {...props} />
    </Suspense>
  );
}

async function AdminCoupons({ searchParams }: PageProps<"/admin/coupons">) {
  const user = await adminUser("admin");
  if (!user) return <p className="text-sm text-neutral-600">Only admins can manage coupons.</p>;
  const state = parseList(await searchParams, spec);
  const { rows, total } = await listCouponsPaged(state);
  type Row = (typeof rows)[number];
  const now = new Date();
  const stateOf = (c: Row) => (!c.isActive ? "Paused" : now < new Date(c.startsAt) ? "Scheduled" : now > new Date(c.endsAt) ? "Ended" : "Live");
  const TONE = { Live: "green", Scheduled: "blue", Ended: "neutral", Paused: "amber" } as const;
  const columns: Column<Row>[] = [
    { key: "code", label: "Code", cell: (c) => <span className="flex flex-col"><span className="font-mono font-medium">{c.code}</span>{c.description && <span className="text-xs text-neutral-500">{c.description}</span>}</span> },
    { key: "offer", label: "Offer", cell: (c) => <span>{c.kind === "percent" ? `${c.valueBps / 100}% off` : c.kind === "flat" ? `${formatPrice(c.valueP)} off` : "Free shipping"}{c.maxDiscountP > 0 && ` (max ${formatPrice(c.maxDiscountP)})`}{c.minSubtotalP > 0 && <span className="block text-xs text-neutral-500">on {formatPrice(c.minSubtotalP)}+</span>}</span> },
    { key: "valid", label: "Valid", sort: "ends", cell: (c) => <span className="text-xs">{adminDay.format(new Date(c.startsAt))} – {adminDay.format(new Date(c.endsAt))}</span> },
    { key: "uses", label: "Used", sort: "uses", align: "right", cell: (c) => <>{c.usedCount}{c.usageLimit > 0 && ` / ${c.usageLimit}`}</> },
    { key: "state", label: "Status", cell: (c) => <span className="flex flex-col items-start gap-0.5"><Badge tone={TONE[stateOf(c)]}>{stateOf(c)}</Badge>{c.showOnProduct && <span className="text-xs text-neutral-500">On product pages</span>}</span> },
    {
      key: "actions",
      label: "",
      align: "right",
      cell: (c) => (
        <span className="inline-flex items-center gap-1">
          <CouponToggle code={c.code} active={c.isActive} />
          <CouponRowActions
            used={c.usedCount > 0}
            coupon={{ code: c.code, description: c.description, kind: c.kind, value: c.kind === "percent" ? c.valueBps / 100 : c.kind === "flat" ? c.valueP / 100 : 0, maxDiscount: c.maxDiscountP / 100, minSubtotal: c.minSubtotalP / 100, startsAt: istDate(new Date(c.startsAt)), endsAt: istDate(new Date(c.endsAt)), usageLimit: c.usageLimit, perCustomerLimit: c.perCustomerLimit, showOnProduct: !!c.showOnProduct }}
          />
        </span>
      ),
    },
  ];
  return (
    <>
      <PageHeader title="Coupons" description="One code per order. Discounts apply before GST and are shared across items." actions={<NewCouponButton />} />
      <ListToolbar
        placeholder="Code or description"
        exportKind="coupons"
        sorts={[{ value: "created", label: "Created" }, { value: "ends", label: "Ends" }, { value: "uses", label: "Uses" }]}
        filters={[
          { key: "state", label: "Status", options: [{ value: "live", label: "Live" }, { value: "scheduled", label: "Scheduled" }, { value: "ended", label: "Ended" }, { value: "paused", label: "Paused" }] },
          { key: "kind", label: "Type", type: "multi", options: [{ value: "percent", label: "Percent" }, { value: "flat", label: "Flat ₹" }, { value: "free_shipping", label: "Free shipping" }] },
        ]}
      />
      <DataTable base="/admin/coupons" spec={spec} state={state} total={total} rows={rows} columns={columns} rowKey={(c) => c.code} empty={<Empty title="No coupons match" action={<NewCouponButton />} />} />
    </>
  );
}
