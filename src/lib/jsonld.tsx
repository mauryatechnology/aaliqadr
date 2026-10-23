import type { BreadcrumbList, Organization, Product, ProductGroup, Thing, WebSite, WithContext } from "schema-dts";
import { site } from "@/config/site";
import { ZODIAC } from "@/config/zodiac";
import type { ProductDTO } from "@/server/catalog/types";
import { toDecimalString } from "./money";

/** Server-rendered JSON-LD. `<` is escaped so content can never close the script tag. */
export function JsonLd<T extends Thing>({ data }: { data: WithContext<T> }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />;
}

const abs = (path: string) => new URL(path, site.url).toString();

export function organizationLd(): WithContext<Organization> {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: site.name,
    legalName: site.legal.legalName,
    url: site.url,
    logo: abs("/brand/logo-mark-512.png"),
    address: { "@type": "PostalAddress", addressLocality: site.legal.city, addressRegion: site.legal.state, addressCountry: "IN" },
  };
}

export function websiteLd(): WithContext<WebSite> {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: site.name,
    url: site.url,
    potentialAction: {
      "@type": "SearchAction",
      target: { "@type": "EntryPoint", urlTemplate: `${abs("/search")}?q={search_term_string}` },
      // schema-dts lacks the Google-specific "query-input" property.
      ...({ "query-input": "required name=search_term_string" } as object),
    },
  };
}

export function breadcrumbLd(items: { name: string; path: string }[]): WithContext<BreadcrumbList> {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({ "@type": "ListItem", position: i + 1, name: it.name, item: abs(it.path) })),
  };
}

/** ProductGroup with one Product/Offer per size (docs/10 §4). Values mirror what the page shows. */
export function productLd(p: ProductDTO): WithContext<ProductGroup> | WithContext<Product> {
  const sign = p.zodiacSign ? ZODIAC[p.zodiacSign] : undefined;
  const images = p.media.length ? p.media.map((m) => m.url) : [abs(`/perfume/${p.slug}/opengraph-image`)];
  const variants: Product[] = p.variants
    .filter((v) => v.isActive)
    .map((v) => ({
      "@type": "Product",
      sku: v.sku,
      name: `${p.name} ${v.label}`,
      size: v.label,
      image: images,
      offers: {
        "@type": "Offer",
        url: abs(`/perfume/${p.slug}`),
        price: toDecimalString(v.priceP),
        priceCurrency: "INR",
        availability: v.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
        itemCondition: "https://schema.org/NewCondition",
        seller: { "@type": "Organization", name: site.name },
      },
    }));
  const rating =
    p.ratingCount > 0
      ? { aggregateRating: { "@type": "AggregateRating" as const, ratingValue: p.ratingAvg.toFixed(1), reviewCount: p.ratingCount } }
      : {};
  return {
    "@context": "https://schema.org",
    "@type": "ProductGroup",
    name: p.name,
    description: p.tagline,
    url: abs(`/perfume/${p.slug}`),
    productGroupID: p.id,
    brand: { "@type": "Brand", name: site.name },
    image: images,
    variesBy: "https://schema.org/size",
    hasVariant: variants,
    ...(sign ? { audience: { "@type": "Audience", audienceType: `${sign.name} (${sign.rashi})` } } : {}),
    ...rating,
  };
}
