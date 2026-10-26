import { Suspense } from "react";
import type { Route } from "next";
import { listQuery, parseList } from "@/lib/list-params";
import { hasRole } from "@/server/auth";
import { adminUser } from "@/server/admin/guard";
import { listReviewsPaged } from "@/server/admin/lists";
import { LIST_SPECS } from "@/server/admin/list-kinds";
import { AdminSkeleton, Empty, PageHeader } from "@/components/admin/ui";
import { ListTabs, Pagination } from "@/components/admin/kit/DataTable";
import { ListToolbar } from "@/components/admin/kit/ListToolbar";
import { ReviewCard } from "@/components/admin/ops/ReviewCard";
import { REVIEW_FORM, ReviewBulkBar } from "@/components/admin/ops/ReviewBulkBar";

export const metadata = { title: "Reviews" };

const spec = LIST_SPECS.reviews;
const BASE = "/admin/reviews";

export default function Page(props: PageProps<"/admin/reviews">) {
  return (
    <Suspense fallback={<AdminSkeleton />}>
      <AdminReviews {...props} />
    </Suspense>
  );
}

async function AdminReviews({ searchParams }: PageProps<"/admin/reviews">) {
  const user = await adminUser();
  if (!user) return null;
  const sp = await searchParams;
  // Waiting reviews are the default view.
  const state = parseList(sp.status === undefined ? { ...sp, status: "pending" } : sp.status === "all" ? { ...sp, status: undefined } : sp, spec);
  const { rows, total, statusCounts } = await listReviewsPaged(state);
  const all = Object.values(statusCounts).reduce((a, b) => a + b, 0);
  const pages = Math.max(1, Math.ceil(total / state.size));
  const href = (patch: Parameters<typeof listQuery>[2]) => {
    const q = listQuery(state, spec, patch);
    return `${BASE}${q}${!state.f.status && !patch?.f?.status ? `${q ? "&" : "?"}status=all` : ""}` as Route;
  };
  return (
    <>
      <PageHeader title="Reviews" description="Reviews appear on product pages only after you publish them. Verified purchase means the customer received this product." />
      <ListTabs
        base={BASE}
        spec={spec}
        state={state}
        filter="status"
        tabs={[
          { value: "pending", label: "Waiting", count: statusCounts.pending ?? 0 },
          { value: "approved", label: "Published", count: statusCounts.approved ?? 0 },
          { value: "rejected", label: "Hidden", count: statusCounts.rejected ?? 0 },
        ]}
      />
      <p className="-mt-2 mb-3 text-xs"><a href={`${BASE}?status=all`} className="text-neutral-600 underline underline-offset-4">All {all}</a></p>
      <ListToolbar
        placeholder="Text, product, name or email"
        exportKind={hasRole(user, "owner") ? "reviews" : undefined}
        sorts={[{ value: "date", label: "Date" }, { value: "rating", label: "Rating" }]}
        filters={[
          { key: "rating", label: "Rating", type: "multi", options: [5, 4, 3, 2, 1].map((n) => ({ value: String(n), label: `${n} ★` })) },
          { key: "verified", label: "Verified", options: [{ value: "yes", label: "Verified purchase" }, { value: "no", label: "Not verified" }] },
          { key: "photos", label: "Photos", options: [{ value: "yes", label: "With photos" }, { value: "no", label: "Without photos" }] },
        ]}
      />
      {rows.length === 0 ? (
        <Empty title={state.f.status?.[0] === "pending" ? "Nothing waiting" : "No reviews match"}>New reviews from customers land in Waiting.</Empty>
      ) : (
        <>
          <ReviewBulkBar />
          <div className="flex flex-col gap-3">
            {rows.map((r) => <ReviewCard key={r.id} r={r} canDelete={hasRole(user, "admin")} selectForm={REVIEW_FORM} />)}
          </div>
          <div className="mt-3">
            <Pagination total={total} from={(state.page - 1) * state.size + 1} to={Math.min(total, state.page * state.size)} page={state.page} pages={pages} size={state.size} href={href} />
          </div>
        </>
      )}
    </>
  );
}
