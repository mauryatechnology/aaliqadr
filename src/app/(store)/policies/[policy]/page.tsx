import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DEFAULT_POLICIES, POLICY_SLUGS, type PolicySlug } from "@/config/policies";
import { getPolicy } from "@/server/queries/engagement";
import { breadcrumbLd, JsonLd } from "@/lib/jsonld";
import { PageHero } from "@/components/layout/PageHero";

// Every param is prerendered, and the page (and its theme colour) is the URL's content, so a
// navigation waits for that prerendered page rather than flashing a shared skeleton.
export const instant = false;

export function generateStaticParams() {
  return POLICY_SLUGS.map((policy) => ({ policy }));
}

/** The published version from the CMS, else the built-in draft. */
async function resolvePolicy(slug: string) {
  if (!(POLICY_SLUGS as string[]).includes(slug)) return null;
  const published = await getPolicy(slug as PolicySlug);
  return published ? { ...published, draft: false } : { ...DEFAULT_POLICIES[slug as PolicySlug], draft: true, version: 0, updatedAt: undefined };
}

export async function generateMetadata({ params }: PageProps<"/policies/[policy]">): Promise<Metadata> {
  const { policy } = await params;
  const p = await resolvePolicy(policy);
  return p
    ? {
        title: `${p.title} · Aaliqadr Policies`,
        description: p.summary,
        alternates: { canonical: `/policies/${policy}` },
        openGraph: {
          title: `${p.title} · Aaliqadr`,
          description: p.summary,
          url: `/policies/${policy}`,
        },
      }
    : { title: "Not found" };
}

export default async function PolicyPage({ params }: PageProps<"/policies/[policy]">) {
  const { policy } = await params;
  const p = await resolvePolicy(policy);
  if (!p) notFound();
  return (
    <article>
      <PageHero eyebrow="Policies" title={p.title}>
        <p className="text-muted max-w-2xl text-lg">{p.summary}</p>
      </PageHero>
      <div className="mx-auto max-w-[1360px] px-4 pb-24 sm:px-6">
        <div className="max-w-3xl">
          {p.draft ? (
            <p className="border-gold/30 text-gold-light rounded-xl border p-3 text-xs">Draft: pending legal review before launch.</p>
          ) : (
            <p className="text-muted text-xs">Version {p.version}{p.updatedAt ? `, updated ${new Intl.DateTimeFormat("en-IN", { dateStyle: "long", timeZone: "Asia/Kolkata" }).format(new Date(p.updatedAt))}` : ""}</p>
          )}
          <div className="mt-10 flex flex-col gap-8">
            {p.sections.map(({ heading, body }) => (
              <section key={heading}>
                <h2 className="font-display text-2xl">{heading}</h2>
                <p className="text-muted mt-2 leading-relaxed whitespace-pre-line">{body}</p>
              </section>
            ))}
          </div>
        </div>
      </div>
      <JsonLd
        data={breadcrumbLd([
          { name: "Home", path: "/" },
          { name: p.title, path: `/policies/${policy}` },
        ])}
      />
    </article>
  );
}
