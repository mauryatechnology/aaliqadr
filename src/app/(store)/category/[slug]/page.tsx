import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { breadcrumbLd, collectionPageLd, JsonLd } from "@/lib/jsonld";
import { routes } from "@/lib/routes";
import { SEED_CATEGORIES } from "@/server/catalog/seed";
import { getCategories, getCategoryCards } from "@/server/queries/catalog";
import { PageHero } from "@/components/layout/PageHero";
import { FacetedSection } from "@/components/listing/FacetedSection";

// Every category is prerendered; its products are the URL's content.
export const instant = false;

export async function generateStaticParams() {
  // Seed slugs keep the list non-empty even before the database is seeded.
  const slugs = new Set([...SEED_CATEGORIES.map((c) => c.slug), ...(await getCategories()).map((c) => c.slug)]);
  return [...slugs].map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps<"/category/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const data = await getCategoryCards(slug);
  if (!data) return { title: "Not found", robots: { index: false } };
  const { category } = data;
  const title = category.seo.title ?? `${category.name}: Luxury Perfumes`;
  const description = category.seo.description ?? (category.description || `Shop ${category.name} by Aaliqadr.`);
  return { title, description, alternates: { canonical: `/category/${slug}` }, openGraph: { title, description, url: `/category/${slug}`, ...(category.image ? { images: [category.image.url] } : {}) } };
}

export default async function CategoryPage({ params, searchParams }: PageProps<"/category/[slug]">) {
  const { slug } = await params;
  const data = await getCategoryCards(slug);
  if (!data) notFound();
  const { category, children, trail, cards } = data;
  return (
    <>
      <PageHero eyebrow={trail.length ? trail.map((t) => t.name).join(" · ") : "Category"} title={category.name}>
        {category.description && <p className="text-muted max-w-2xl text-lg">{category.description}</p>}
      </PageHero>
      <div className="mx-auto max-w-[1360px] px-4 pb-24 sm:px-6">
        {category.image && (
          <div className="surface relative mb-10 aspect-[16/6] overflow-clip">
            <Image src={category.image.url} alt={category.image.alt || category.name} fill sizes="(min-width: 1360px) 1360px, 100vw" className="object-cover" preload />
          </div>
        )}
        <nav aria-label="Breadcrumb" className="text-muted mb-6 flex flex-wrap gap-x-1 text-xs">
          <Link href="/shop" className="hover:text-fg">Shop</Link>
          {trail.map((t) => (
            <span key={t.id}><span aria-hidden>/ </span><Link href={routes.category(t.slug)} className="hover:text-fg">{t.name}</Link></span>
          ))}
          <span><span aria-hidden>/ </span>{category.name}</span>
        </nav>
        {children.length > 0 && (
          <nav aria-label="Sub-categories" className="mb-8 flex flex-wrap gap-2">
            {children.map((c) => (
              <Link key={c.id} href={routes.category(c.slug)} className="rounded-full border border-white/15 px-4 py-2 text-xs uppercase tracking-[0.18em] text-fg/80 transition-colors hover:border-gold/60">
                {c.name}
              </Link>
            ))}
          </nav>
        )}
        {cards.length ? <FacetedSection cards={cards} base={`/category/${slug}`} searchParams={searchParams} hide={children.length ? [] : ["category"]} /> : <p className="text-muted">New pieces are on their way. <Link href="/shop" className="underline underline-offset-4">Browse everything</Link>.</p>}
      </div>
      <JsonLd data={collectionPageLd({ name: category.name, description: category.description, path: `/category/${slug}`, items: cards.map((c) => ({ name: c.name, path: `/perfume/${c.slug}`, image: c.media[0]?.url })) })} />
      <JsonLd data={breadcrumbLd([{ name: "Home", path: "/" }, { name: "Shop", path: "/shop" }, ...trail.map((t) => ({ name: t.name, path: `/category/${t.slug}` })), { name: category.name, path: `/category/${slug}` }])} />
    </>
  );
}
