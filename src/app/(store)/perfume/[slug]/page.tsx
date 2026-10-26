import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { site } from "@/config/site";
import { formatPrice } from "@/lib/money";
import { getProductBySlug, getProductSlugs } from "@/server/queries/catalog";
import { SIGNS, ZODIAC } from "@/config/zodiac";
import { ProductView, themeSignFor } from "@/components/product/ProductView";

// Every param is prerendered, and the page (and its theme colour) is the URL's content, so a
// navigation waits for that prerendered page rather than flashing a shared skeleton.
export const instant = false;

export async function generateStaticParams() {
  // The twelve signature slugs are known from config, so the list is never empty
  // (an empty list fails the build under Cache Components), even before the DB is seeded.
  const slugs = new Set([...SIGNS.map((s) => s.fragrance.slug), ...(await getProductSlugs())]);
  return [...slugs].map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps<"/perfume/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const p = await getProductBySlug(slug);
  if (!p) return { title: "Not found", robots: { index: false } };
  const sign = p.zodiacSign ? ZODIAC[p.zodiacSign] : undefined;
  const title =
    p.seo.title ??
    (sign
      ? `${p.name}: ${sign.name} (${sign.rashi}) Perfume | Extrait de Parfum`
      : p.type === "bundle"
        ? `${p.name}: 12 Zodiac Perfumes Discovery Set | Aaliqadr`
        : `${p.name} | Luxury Fragrance by Aaliqadr`);
  const notes = p.notes
    ? [...p.notes.top, ...p.notes.heart]
        .slice(0, 4)
        .map((n) => n.name)
        .join(", ")
    : "";
  const description =
    p.seo.description ??
    `${p.tagline}.${notes ? ` Notes of ${notes}.` : ""} 28% Extrait de Parfum concentration for 12+ hour wear. Free shipping above ${formatPrice(site.freeShippingAboveP)}.`;

  const keywords = sign
    ? [
        `${sign.name.toLowerCase()} perfume`,
        `${sign.rashi.toLowerCase()} rashi perfume`,
        `${sign.name.toLowerCase()} fragrance`,
        p.name.toLowerCase(),
        "extrait de parfum",
        `${sign.element} sign perfume`,
        "long lasting perfume India",
        `gift for ${sign.name.toLowerCase()}`,
        "zodiac fragrance India",
      ]
    : [
        p.name.toLowerCase(),
        "perfume discovery set",
        "fragrance sample kit",
        "luxury perfume gift set",
        "extrait de parfum collection",
      ];

  return {
    title,
    description,
    keywords,
    alternates: { canonical: `/perfume/${p.slug}` },
    openGraph: {
      title,
      description,
      url: `/perfume/${p.slug}`,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export async function generateViewport({ params }: PageProps<"/perfume/[slug]">): Promise<Viewport> {
  const { slug } = await params;
  const p = await getProductBySlug(slug);
  const sign = p ? themeSignFor(p) : undefined;
  return { themeColor: sign ? ZODIAC[sign].theme.bg : site.obsidian };
}

export default async function ProductPage({ params }: PageProps<"/perfume/[slug]">) {
  const { slug } = await params;
  const p = await getProductBySlug(slug);
  if (!p) notFound();
  return <ProductView p={p} />;
}
