import { Suspense } from "react";
import { adminUser } from "@/server/admin/guard";
import { getContentAdmin } from "@/server/admin/ops";
import { DEFAULT_POLICIES, POLICY_SLUGS, type PolicySlug, type PolicyText } from "@/config/policies";
import { AdminSkeleton, PageHeader } from "@/components/admin/ui";
import { ContentEditor } from "@/components/admin/ops/ContentEditor";

export const metadata = { title: "Content" };

export default function Page() {
  return (
    <Suspense fallback={<AdminSkeleton />}>
      <AdminContent />
    </Suspense>
  );
}

async function AdminContent() {
  const user = await adminUser("admin");
  if (!user) return <p className="text-sm text-neutral-600">Only admins can edit content.</p>;
  const { content, history } = await getContentAdmin();
  const policies = Object.fromEntries(
    POLICY_SLUGS.map((k) => {
      const live = content.policies[k];
      return [k, live ? { title: live.title, summary: live.summary, sections: live.sections, version: live.version } : { ...DEFAULT_POLICIES[k], version: 0 }];
    }),
  ) as Record<PolicySlug, PolicyText & { version: number }>;
  return (
    <>
      <PageHeader title="Content" description="Announcement bar, home banners, FAQs and policies. Changes go live as soon as you publish." />
      <ContentEditor
        initial={{ announcement: content.announcement, banners: content.banners, faqs: content.faqs }}
        policies={policies}
        history={Object.fromEntries(Object.entries(history).map(([k, v]) => [k, v.map((h) => ({ ...h, at: new Date(h.at).toISOString() }))]))}
      />
    </>
  );
}
