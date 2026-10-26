import type {
  BreadcrumbList,
  CollectionPage,
  FAQPage,
  Organization,
  Product,
  ProductGroup,
  Thing,
  WebSite,
  WithContext,
} from "schema-dts";
import { site } from "@/config/site";
import { ZODIAC } from "@/config/zodiac";
import { imagesFor } from "@/lib/variant-media";
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
    description: site.description,
    telephone: site.support.phone,
    email: "care@aaliqadr.com",
    address: {
      "@type": "PostalAddress",
      streetAddress: site.legal.address,
      addressLocality: site.legal.city,
      addressRegion: site.legal.state,
      postalCode: "462011",
      addressCountry: "IN",
    },
    contactPoint: [
      {
        "@type": "ContactPoint",
        telephone: site.support.phone,
        contactType: "customer service",
        areaServed: "IN",
        availableLanguage: ["English", "Hindi"],
      },
    ],
    sameAs: [
      "https://www.instagram.com/aaliqadr",
      "https://www.facebook.com/aaliqadr",
    ],
  };
}

export function websiteLd(): WithContext<WebSite> {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: site.name,
    alternateName: "Aaliqadr Zodiac Perfumes",
    url: site.url,
    description: site.description,
    inLanguage: "en-IN",
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

export function faqLd(faqs: { question: string; answer: string }[]): WithContext<FAQPage> {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: f.answer,
      },
    })),
  };
}

export function collectionPageLd({
  name,
  description,
  path,
  items,
}: {
  name: string;
  description: string;
  path: string;
  items: { name: string; path: string; image?: string; priceP?: number }[];
}): WithContext<CollectionPage> {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name,
    description,
    url: abs(path),
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: items.length,
      itemListElement: items.map((it, idx) => ({
        "@type": "ListItem",
        position: idx + 1,
        url: abs(it.path),
        name: it.name,
        ...(it.image ? { image: it.image } : {}),
      })),
    },
  };
}

/** ProductGroup with one Product/Offer per size (docs/10 §4). Values mirror what the page shows. */
export function productLd(p: ProductDTO): WithContext<ProductGroup> | WithContext<Product> {
  const sign = p.zodiacSign ? ZODIAC[p.zodiacSign] : undefined;
  const photos = p.media.filter((m) => m.kind === "image");
  const images = photos.length ? photos.map((m) => m.url) : [abs(`/perfume/${p.slug}/opengraph-image`)];
  const sizeAxis = p.options.findIndex((o) => /size|volume|ml/i.test(o.name));
  const variants: Product[] = p.variants
    .filter((v) => v.isActive)
    .map((v) => ({
      "@type": "Product",
      sku: v.sku,
      ...(v.barcode ? { gtin: v.barcode } : {}),
      name: `${p.name} — ${v.label}`,
      ...(sizeAxis >= 0 && v.optionValues[sizeAxis] ? { size: v.optionValues[sizeAxis] } : p.options.length === 0 ? { size: v.label } : {}),
      image: (() => {
        const own = imagesFor(p, v.sku).filter((m) => m.kind === "image").map((m) => m.url);
        return own.length ? own : images;
      })(),
      category: "Health & Beauty > Personal Care > Cosmetics > Perfumes & Fragrances",
      offers: {
        "@type": "Offer",
        url: abs(`/perfume/${p.slug}?v=${v.sku}`),
        price: toDecimalString(v.priceP),
        priceCurrency: "INR",
        priceValidUntil: "2027-12-31",
        availability: v.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
        itemCondition: "https://schema.org/NewCondition",
        seller: { "@type": "Organization", name: site.name },
        shippingDetails: {
          "@type": "OfferShippingDetails",
          shippingRate: {
            "@type": "MonetaryAmount",
            value: "0.00",
            currency: "INR",
          },
          shippingDestination: {
            "@type": "DefinedRegion",
            addressCountry: "IN",
          },
          deliveryTime: {
            "@type": "ShippingDeliveryTime",
            handlingTime: {
              "@type": "QuantitativeValue",
              minValue: 1,
              maxValue: 2,
              unitCode: "d",
            },
            transitTime: {
              "@type": "QuantitativeValue",
              minValue: 2,
              maxValue: 5,
              unitCode: "d",
            },
          },
        },
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
    description: p.description.slice(0, 5000),
    url: abs(`/perfume/${p.slug}`),
    productGroupID: p.id,
    brand: { "@type": "Brand", name: site.name },
    image: images,
    ...(sizeAxis >= 0 || p.options.length === 0 ? { variesBy: "https://schema.org/size" } : {}),
    hasVariant: variants,
    ...(sign ? { audience: { "@type": "Audience", audienceType: `${sign.name} (${sign.rashi}) Zodiac Scent` } } : {}),
    ...rating,
  };
}
