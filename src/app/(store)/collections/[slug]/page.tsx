import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { breadcrumbLd, collectionPageLd, JsonLd } from "@/lib/jsonld";
import { SEED_COLLECTIONS } from "@/server/catalog/seed";
import { getCollectionCards, getCollections } from "@/server/queries/catalog";
import { FacetedSection } from "@/components/listing/FacetedSection";
import { Reveal } from "@/components/motion/Reveal";

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
  const title = c.seo.title ?? `${c.name} | Luxury Fragrance Collection | Aaliqadr`;
  const description = c.seo.description ?? (c.description || `The ${c.name} luxury perfume collection by Aaliqadr.`);
  const image = c.banner ?? c.image;
  return {
    title,
    description,
    alternates: { canonical: `/collections/${slug}` },
    openGraph: {
      title,
      description,
      url: `/collections/${slug}`,
      ...(image ? { images: [image.url] } : {}),
    },
  };
}

export default async function CollectionPage({ params, searchParams }: PageProps<"/collections/[slug]">) {
  const { slug } = await params;
  const data = await getCollectionCards(slug);
  if (!data) notFound();
  const { collection: c, cards } = data;

  return (
    <div className="relative overflow-clip bg-[#060508] text-ivory">
      {/* 1. Grand Haute-Parfumerie Collection Detail Hero */}
      <section className="grain relative isolate flex min-h-[46vh] sm:min-h-[52vh] flex-col justify-center items-center overflow-clip pt-28 pb-10 sm:pt-36 sm:pb-14 text-center">
        {/* Soft cosmic starlight radial nebula glow */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 flex items-center justify-center overflow-hidden"
        >
          <div
            className="absolute h-[500px] w-[500px] sm:h-[650px] sm:w-[650px] rounded-full blur-[130px]"
            style={{
              background:
                "radial-gradient(circle, rgba(201,169,110,0.16) 0%, rgba(45,70,120,0.10) 50%, transparent 70%)",
            }}
          />
        </div>

        <div className="mx-auto flex w-full max-w-[1280px] flex-col items-center px-4 sm:px-6">
          <Reveal>
            <p className="eyebrow flex items-center justify-center gap-2 text-gold font-medium tracking-[0.28em] mb-4">
              <span className="text-[9px]">✦</span>
              <span>CURATED EDIT · HOUSE OF AALIQADR · 28% EXTRAIT</span>
              <span className="text-[9px]">✦</span>
            </p>
          </Reveal>

          <Reveal delay={0.08}>
            <h1 className="font-display text-4xl sm:text-6xl md:text-7xl font-light leading-[1.05] tracking-tight max-w-4xl text-ivory">
              {c.name}
            </h1>
          </Reveal>

          {c.description && (
            <Reveal delay={0.16}>
              <p className="mt-4 sm:mt-5 max-w-2xl text-sm sm:text-base text-muted font-light leading-relaxed mx-auto">
                {c.description}
              </p>
            </Reveal>
          )}

          {/* Luxury Breadcrumb / Navigation Pills */}
          <Reveal delay={0.24} className="mt-7 flex flex-wrap items-center justify-center gap-2.5 sm:gap-3.5">
            <Link
              href="/collections"
              className="inline-flex min-h-[40px] items-center rounded-full border border-gold/30 bg-surface/70 px-5 py-2 font-caps text-xs uppercase tracking-[0.16em] text-ivory/85 transition-all duration-300 hover:border-gold hover:bg-gold/10 hover:text-gold active:scale-98"
            >
              ← All Collections
            </Link>
            <span className="inline-flex min-h-[40px] items-center rounded-full border border-gold bg-gold px-5 py-2 font-caps text-xs uppercase tracking-[0.16em] text-obsidian font-semibold shadow-[0_0_12px_rgba(201,169,110,0.35)]">
              {cards.length} {cards.length === 1 ? "Signature" : "Signatures"}
            </span>
            <Link
              href="/find-my-sign"
              className="inline-flex min-h-[40px] items-center gap-1.5 rounded-full border border-gold/40 bg-gold/10 px-5 py-2 font-caps text-xs uppercase tracking-[0.16em] text-gold transition-all duration-300 hover:border-gold hover:bg-gold/20 active:scale-98"
            >
              <span className="text-[10px]">✦</span>
              <span>Find My Sign</span>
            </Link>
          </Reveal>
        </div>
      </section>

      {/* 2. Main Faceted Section Grid */}
      <div className="mx-auto max-w-[1360px] px-4 pb-24 sm:px-6">
        {c.banner && (
          <div className="relative mb-10 aspect-[16/6] overflow-clip rounded-2xl border border-gold/20 bg-surface/60 shadow-[0_15px_40px_rgba(0,0,0,0.6)]">
            <Image
              src={c.banner.url}
              alt={c.banner.alt || c.name}
              fill
              sizes="(min-width: 1360px) 1360px, 100vw"
              className="object-cover"
              preload
            />
          </div>
        )}

        {cards.length ? (
          <FacetedSection cards={cards} base={`/collections/${slug}`} searchParams={searchParams} />
        ) : (
          <div className="py-20 text-center rounded-2xl border border-gold/20 bg-surface/40 p-8 sm:p-12 backdrop-blur-md">
            <p className="font-display text-2xl sm:text-3xl text-ivory font-light italic mb-2">
              This collection is being curated
            </p>
            <p className="text-sm text-muted mb-6 max-w-md mx-auto">
              Our master perfumers are assembling new formulations for this edit.
            </p>
            <Link
              href="/shop"
              className="inline-flex min-h-[44px] items-center rounded-full border border-gold/40 bg-gold/10 px-7 py-2.5 font-caps text-[11px] uppercase tracking-[0.2em] text-gold hover:bg-gold/20 active:scale-98 transition-all"
            >
              Browse All Fragrances
            </Link>
          </div>
        )}
      </div>

      <JsonLd
        data={collectionPageLd({
          name: c.name,
          description: c.description,
          path: `/collections/${slug}`,
          items: cards.map((x) => ({
            name: x.name,
            path: `/perfume/${x.slug}`,
            image: x.media[0]?.url,
          })),
        })}
      />
      <JsonLd
        data={breadcrumbLd([
          { name: "Home", path: "/" },
          { name: "Collections", path: "/collections" },
          { name: c.name, path: `/collections/${slug}` },
        ])}
      />
    </div>
  );
}
