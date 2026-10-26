import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { breadcrumbLd, collectionPageLd, JsonLd } from "@/lib/jsonld";
import { SEED_COLLECTIONS } from "@/server/catalog/seed";
import { getCollectionCards, getCollections } from "@/server/queries/catalog";
import { PageHero } from "@/components/layout/PageHero";
import { FacetedSection } from "@/components/listing/FacetedSection";

// Every collection is prerendered; its products are the URL's content.
export const instant = false;

export async function generateStaticParams() {
  const slugs = new Set([...SEED_COLLECTIONS.map((c) => c.slug), ...(await getCollections()).map((c) => c.slug)]);
  return [...slugs].map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps<"/collections/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const data = await getCollectionCards(slug);
  if (!data) return { title: "Not found", robots: { index: false } };
  const c = data.collection;
  const title = c.seo.title ?? `${c.name} | Aaliqadr`;
  const description = c.seo.description ?? (c.description || `The ${c.name} collection by Aaliqadr.`);
  const image = c.banner ?? c.image;
  return { title, description, alternates: { canonical: `/collections/${slug}` }, openGraph: { title, description, url: `/collections/${slug}`, ...(image ? { images: [image.url] } : {}) } };
}

export default async function CollectionPage({ params, searchParams }: PageProps<"/collections/[slug]">) {
  const { slug } = await params;
  const data = await getCollectionCards(slug);
  if (!data) notFound();
  const { collection: c, cards } = data;
  return (
    <>
      <PageHero eyebrow="Collection" title={c.name}>
        {c.description && <p className="text-muted max-w-2xl text-lg">{c.description}</p>}
      </PageHero>
      <div className="mx-auto max-w-[1360px] px-4 pb-24 sm:px-6">
        {c.banner && (
          <div className="surface relative mb-10 aspect-[16/6] overflow-clip">
            <Image src={c.banner.url} alt={c.banner.alt || c.name} fill sizes="(min-width: 1360px) 1360px, 100vw" className="object-cover" preload />
          </div>
        )}
        {cards.length ? <FacetedSection cards={cards} base={`/collections/${slug}`} searchParams={searchParams} /> : <p className="text-muted">This collection is being curated. <Link href="/shop" className="underline underline-offset-4">Browse everything</Link>.</p>}
      </div>
      <JsonLd data={collectionPageLd({ name: c.name, description: c.description, path: `/collections/${slug}`, items: cards.map((x) => ({ name: x.name, path: `/perfume/${x.slug}`, image: x.media[0]?.url })) })} />
      <JsonLd data={breadcrumbLd([{ name: "Home", path: "/" }, { name: "Collections", path: "/collections" }, { name: c.name, path: `/collections/${slug}` }])} />
    </>
  );
}
