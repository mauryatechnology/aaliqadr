import type { MetadataRoute } from "next";
import { site } from "@/config/site";
import { ZODIAC_SLUGS } from "@/config/zodiac";
import { getAllProducts, getCategories, getCollections } from "@/server/queries/catalog";

const POLICIES = ["shipping", "returns", "privacy", "terms", "grievance"];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [products, categories, collections] = await Promise.all([getAllProducts(), getCategories(), getCollections()]);
  const url = (path: string) => new URL(path, site.url).toString();
  const lastProduct = products.reduce((d, p) => (p.updatedAt > d ? p.updatedAt : d), "1970-01-01T00:00:00.000Z");
  return [
    { url: url("/"), lastModified: lastProduct, changeFrequency: "daily", priority: 1 },
    { url: url("/zodiac"), changeFrequency: "monthly", priority: 0.9 },
    ...ZODIAC_SLUGS.map((s) => ({ url: url(`/zodiac/${s}`), changeFrequency: "monthly" as const, priority: 0.9 })),
    ...products.map((p) => ({ url: url(`/perfume/${p.slug}`), lastModified: p.updatedAt, changeFrequency: "weekly" as const, priority: 0.8 })),
    { url: url("/shop"), lastModified: lastProduct, changeFrequency: "weekly", priority: 0.7 },
    ...categories.map((c) => ({ url: url(`/category/${c.slug}`), lastModified: lastProduct, changeFrequency: "weekly" as const, priority: 0.7 })),
    { url: url("/collections"), lastModified: lastProduct, changeFrequency: "weekly", priority: 0.6 },
    ...collections.map((c) => ({ url: url(`/collections/${c.slug}`), lastModified: lastProduct, changeFrequency: "weekly" as const, priority: 0.6 })),
    { url: url("/faq"), changeFrequency: "monthly", priority: 0.4 },
    { url: url("/find-my-sign"), changeFrequency: "yearly", priority: 0.6 },
    { url: url("/about"), changeFrequency: "yearly", priority: 0.4 },
    { url: url("/contact"), changeFrequency: "yearly", priority: 0.3 },
    ...POLICIES.map((p) => ({ url: url(`/policies/${p}`), changeFrequency: "yearly" as const, priority: 0.2 })),
  ];
}
