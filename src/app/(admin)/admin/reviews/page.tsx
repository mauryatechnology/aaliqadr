import Link from "next/link";
import type { Route } from "next";
import { Suspense } from "react";
import { hasRole } from "@/server/auth";
import { adminUser } from "@/server/admin/guard";
import { listReviewsAdmin, OPS_PAGE } from "@/server/admin/ops";
import { cn } from "@/lib/cn";
import { AdminSkeleton, btnSecondary, Empty, PageHeader } from "@/components/admin/ui";
import { ReviewCard } from "@/components/admin/ops/ReviewCard";

export const metadata = { title: "Reviews" };

export default function Page(props: PageProps<"/admin/reviews">) {
  return (
    <Suspense fallback={<AdminSkeleton />}>
      <AdminReviews {...props} />
    </Suspense>
  );
}

const TABS = [
  { key: "pending", label: "Waiting" },
  { key: "approved", label: "Published" },
  { key: "rejected", label: "Hidden" },
  { key: "all", label: "All" },
] as const;

async function AdminReviews({ searchParams }: PageProps<"/admin/reviews">) {
  const user = await adminUser();
  if (!user) return null;
  const sp = await searchParams;
  const status = TABS.find((t) => t.key === sp.status)?.key ?? "pending";
  const page = Math.max(1, Number(sp.page) || 1);
  const { rows, total, counts } = await listReviewsAdmin(status, page);
  const all = Object.values(counts).reduce((a, b) => a + b, 0);
  return (
    <>
      <PageHeader title="Reviews" description="Reviews appear on product pages only after you publish them. Verified purchase means the customer received this product." />
      <nav aria-label="Status" className="mb-4 flex flex-wrap gap-1 border-b border-neutral-200">
        {TABS.map((t) => (
          <Link key={t.key} href={`/admin/reviews?status=${t.key}` as Route} aria-current={status === t.key ? "page" : undefined} className={cn("-mb-px border-b-2 px-3 py-2 text-sm font-medium", status === t.key ? "border-neutral-900 text-neutral-900" : "border-transparent text-neutral-600 hover:text-neutral-900")}>
            {t.label} <span className="ml-1 rounded-full bg-neutral-100 px-1.5 text-xs text-neutral-600">{t.key === "all" ? all : (counts[t.key] ?? 0)}</span>
          </Link>
        ))}
      </nav>
      {rows.length === 0 ? (
        <Empty title={status === "pending" ? "Nothing waiting" : "No reviews here"}>New reviews from customers land in Waiting.</Empty>
      ) : (
        <div className="flex flex-col gap-3">
          {rows.map((r) => <ReviewCard key={r.id} r={r} canDelete={hasRole(user, "admin")} />)}
        </div>
      )}
      {total > page * OPS_PAGE && <Link className={`${btnSecondary} mt-4`} href={`/admin/reviews?status=${status}&page=${page + 1}` as Route}>More</Link>}
    </>
  );
}
