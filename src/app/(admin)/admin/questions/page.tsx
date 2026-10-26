import Link from "next/link";
import type { Route } from "next";
import { Suspense } from "react";
import { cn } from "@/lib/cn";
import { adminUser } from "@/server/admin/guard";
import { listQuestionsAdmin, OPS_PAGE } from "@/server/admin/ops";
import { AdminSkeleton, btnSecondary, Empty, PageHeader } from "@/components/admin/ui";
import { QuestionCard } from "@/components/admin/ops/QuestionCard";

export const metadata = { title: "Questions" };

const TABS = [
  { key: "pending", label: "Waiting" },
  { key: "answered", label: "Answered" },
  { key: "hidden", label: "Hidden" },
] as const;

export default function Page(props: PageProps<"/admin/questions">) {
  return (
    <Suspense fallback={<AdminSkeleton />}>
      <AdminQuestions {...props} />
    </Suspense>
  );
}

async function AdminQuestions({ searchParams }: PageProps<"/admin/questions">) {
  const user = await adminUser();
  if (!user) return null;
  const sp = await searchParams;
  const status = TABS.find((t) => t.key === sp.status)?.key ?? "pending";
  const page = Math.max(1, Number(sp.page) || 1);
  const { rows, total, counts } = await listQuestionsAdmin(status, page);
  return (
    <>
      <PageHeader title="Questions" description="Customer questions from product pages. Only answered questions are shown, and the customer is emailed the answer. Switch the section on in Settings." />
      <nav aria-label="Status" className="mb-3 flex flex-wrap gap-1 border-b border-neutral-200">
        {TABS.map((t) => (
          <Link key={t.key} href={`/admin/questions?status=${t.key}` as Route} aria-current={status === t.key ? "page" : undefined} className={cn("-mb-px border-b-2 px-3 py-2 text-sm font-medium", status === t.key ? "border-neutral-900 text-neutral-900" : "border-transparent text-neutral-600 hover:text-neutral-900")}>
            {t.label} <span className="ml-1 rounded-full bg-neutral-100 px-1.5 text-xs text-neutral-600">{counts[t.key] ?? 0}</span>
          </Link>
        ))}
      </nav>
      {rows.length === 0 ? <Empty title={status === "pending" ? "Nothing waiting" : "None here"} /> : <div className="flex flex-col gap-3">{rows.map((q) => <QuestionCard key={q.id} q={q} />)}</div>}
      {total > page * OPS_PAGE && <Link className={`${btnSecondary} mt-4`} href={`/admin/questions?status=${status}&page=${page + 1}` as Route}>More</Link>}
    </>
  );
}
