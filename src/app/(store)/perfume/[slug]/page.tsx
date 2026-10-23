import type { Metadata, Viewport } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronDown, ShieldCheck, Truck } from "lucide-react";
import { ELEMENT_INFO, SIGNS, ZODIAC, type ZodiacSlug } from "@/config/zodiac";
import { site } from "@/config/site";
import { formatPrice } from "@/lib/money";
import { breadcrumbLd, JsonLd, productLd } from "@/lib/jsonld";
import type { ProductDTO } from "@/server/catalog/types";
import { getProductBySlug, getProductCards, getProductSlugs } from "@/server/queries/catalog";
import { ZodiacScope } from "@/components/zodiac/ZodiacScope";
import { AmbientLayer } from "@/components/zodiac/AmbientLayer";
import { BottleArt } from "@/components/zodiac/BottleArt";
import { Glyph } from "@/components/zodiac/Glyph";
import { NotesPyramid } from "@/components/product/NotesPyramid";
import { ScentProfile } from "@/components/product/ScentProfile";
import { VariantPicker } from "@/components/product/VariantPicker";
import { ProductCard } from "@/components/product/ProductCard";
import { Reveal } from "@/components/motion/Reveal";
import { Parallax } from "@/components/motion/Parallax";
import { Depth, PointerDepth } from "@/components/motion/PointerDepth";
import { routes } from "@/lib/routes";

// Every param is prerendered, and the page (and its theme colour) is the URL's content, so a
// navigation waits for that prerendered page rather than flashing a shared skeleton.
export const instant = false;

export async function generateStaticParams() {
  // The twelve signature slugs are known from config, so the list is never empty
  // (an empty list fails the build under Cache Components), even before the DB is seeded.
  const slugs = new Set([...SIGNS.map((s) => s.fragrance.slug), ...(await getProductSlugs())]);
  return [...slugs].map((slug) => ({ slug }));
}

/** Fragrances use their sign; element trios borrow their element's first sign; bundles stay on brand. */
function themeSignFor(p: ProductDTO): ZodiacSlug | undefined {
  return p.zodiacSign ?? (p.element ? ELEMENT_INFO[p.element].signs[0] : undefined);
}

export async function generateMetadata({ params }: PageProps<"/perfume/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const p = await getProductBySlug(slug);
  if (!p) return { title: "Not found", robots: { index: false } };
  const sign = p.zodiacSign ? ZODIAC[p.zodiacSign] : undefined;
  const title = p.seo.title ?? (sign ? `${p.name}: ${sign.name} (${sign.rashi}) Perfume, Extrait de Parfum` : p.name);
  const notes = p.notes
    ? [...p.notes.top, ...p.notes.heart]
        .slice(0, 4)
        .map((n) => n.name)
        .join(", ")
    : "";
  const description =
    p.seo.description ?? `${p.tagline}.${notes ? ` Notes of ${notes}.` : ""} Free shipping above ${formatPrice(site.freeShippingAboveP)}.`;
  return {
    title,
    description,
    alternates: { canonical: `/perfume/${p.slug}` },
    openGraph: { title, description, url: `/perfume/${p.slug}` },
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
  const themeSign = themeSignFor(p);
  const sign = p.zodiacSign ? ZODIAC[p.zodiacSign] : undefined;
  const cards = await getProductCards();
  const related = (p.compatibleSigns ?? [])
    .map((c) => cards.find((x) => x.zodiacSign === c))
    .filter((x) => x !== undefined)
    .slice(0, 4);

  const body = (
    <>
      <PointerDepth className="relative overflow-clip">
        <Parallax speed={-0.5} className="absolute inset-x-0 -inset-y-32 -z-10">
          <Depth strength={-20} className="absolute inset-0">
            {themeSign ? <AmbientLayer sign={themeSign} intensity={0.6} /> : <div aria-hidden className="aurora" />}
          </Depth>
        </Parallax>
        <div className="mx-auto grid max-w-[1360px] grid-cols-1 gap-10 px-4 py-10 sm:px-6 lg:grid-cols-[1.1fr_1fr] lg:gap-16 lg:py-16">
          {/* Gallery */}
          <div className="lg:sticky lg:top-24 lg:self-start">
            <div
              className="surface relative grid aspect-[4/5] place-items-center overflow-clip"
              style={{
                viewTransitionName: `product-${p.slug}`,
                background: "radial-gradient(80% 70% at 50% 35%, var(--z-g2), var(--z-bg) 85%)",
              }}
            >
              {p.media[0] ? (
                <Image
                  src={p.media[0].url}
                  alt={p.media[0].alt}
                  fill
                  quality={85}
                  sizes="(min-width: 1024px) 50vw, 100vw"
                  className="object-cover"
                  preload
                />
              ) : (
                <Parallax speed={0.18} className="w-1/2 max-w-xs">
                  <Depth strength={22}>
                    <BottleArt sign={sign?.slug} preload className="animate-float drop-shadow-[0_30px_70px_rgba(0,0,0,.6)]" />
                  </Depth>
                </Parallax>
              )}
            </div>
          </div>

          {/* Buy box */}
          <div className="flex flex-col gap-7">
            <nav aria-label="Breadcrumb" className="text-muted text-xs">
              <Link href="/shop" className="hover:text-fg">
                Shop
              </Link>
              {sign && (
                <>
                  {" / "}
                  <Link href={routes.sign(sign.slug)} className="hover:text-fg">
                    {sign.name}
                  </Link>
                </>
              )}
            </nav>
            <div className="flex flex-col gap-3">
              <p className="eyebrow flex items-center gap-2">
                {sign ? (
                  <>
                    <Glyph sign={sign.slug} label={false} /> {sign.name} · {sign.rashi} ·{" "}
                    {p.concentration === "extrait" ? "Extrait de Parfum" : p.legal.genericName}
                  </>
                ) : p.type === "bundle" ? (
                  "Discovery · All twelve signs"
                ) : (
                  "Gift set"
                )}
              </p>
              <h1 className="font-display text-5xl leading-none sm:text-6xl">{p.name}</h1>
              <p className="text-muted text-lg">{p.tagline}.</p>
            </div>

            <VariantPicker slug={p.slug} variants={p.variants} />

            <ul className="text-muted grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
              <li className="flex items-center gap-2">
                <Truck className="text-accent size-4" aria-hidden /> Free shipping above {formatPrice(site.freeShippingAboveP)}
              </li>
              <li className="flex items-center gap-2">
                <ShieldCheck className="text-accent size-4" aria-hidden /> Sealed, authentic, batch-coded
              </li>
            </ul>

            <div className="hairline" />

            <div className="flex flex-col divide-y divide-white/10">
              <Section title="The story" open>
                <p className="leading-relaxed">{p.description}</p>
              </Section>
              {p.includes && p.includes.length > 0 && (
                <Section title="What's inside" open>
                  <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {p.includes.map((i) => (
                      <li key={i.name} className="flex flex-col">
                        <span className="text-fg">{i.name}</span>
                        <span className="text-xs">{i.detail}</span>
                      </li>
                    ))}
                  </ul>
                </Section>
              )}
              {p.howToWear && (
                <Section title="How to wear">
                  <p className="leading-relaxed">{p.howToWear}</p>
                </Section>
              )}
              <Section title="Details & legal">
                <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2">
                  <dt>Product</dt>
                  <dd className="text-fg">{p.legal.genericName}</dd>
                  <dt>Net quantity</dt>
                  <dd className="text-fg">
                    {p.variants
                      .filter((v) => v.isActive)
                      .map((v) => v.label)
                      .join(" / ")}
                  </dd>
                  <dt>MRP</dt>
                  <dd className="text-fg">
                    {p.variants
                      .filter((v) => v.isActive)
                      .map((v) => `${formatPrice(v.mrpP)} (${v.label})`)
                      .join(", ")}
                    , inclusive of all taxes
                  </dd>
                  <dt>Manufactured by</dt>
                  <dd className="text-fg">{p.legal.manufacturer}</dd>
                  <dt>Country of origin</dt>
                  <dd className="text-fg">{p.legal.countryOfOrigin}</dd>
                  <dt>Mfg. date & batch</dt>
                  <dd className="text-fg">As printed on the pack</dd>
                </dl>
                <p className="mt-4 text-xs">Flammable. Keep away from heat and flame. For external use only. Avoid contact with eyes.</p>
              </Section>
            </div>
          </div>
        </div>
      </PointerDepth>

      {p.notes && (
        <section className="mx-auto max-w-4xl px-4 py-20 text-center sm:px-6">
          <Reveal className="mb-10 flex flex-col items-center gap-3">
            <p className="eyebrow">Olfactive pyramid</p>
            <h2 className="font-display text-4xl sm:text-5xl">How it unfolds</h2>
          </Reveal>
          <NotesPyramid notes={p.notes} />
          {p.profile && (
            <Reveal className="surface mt-12 p-6 text-left sm:p-8">
              <ScentProfile profile={p.profile} />
              <p className="text-muted mt-6 text-sm">
                Best in {p.profile.season.join(" & ").toLowerCase()}, {p.profile.timeOfDay.join(" or ")}.
              </p>
            </Reveal>
          )}
        </section>
      )}

      {related.length > 0 && (
        <section className="mx-auto max-w-[1360px] px-4 py-16 sm:px-6">
          <Reveal className="mb-10 flex flex-col gap-3">
            <p className="eyebrow">Pairs well with</p>
            <h2 className="font-display text-4xl">Compatible signs</h2>
          </Reveal>
          <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {related.map((r) => (
              <li key={r.id}>
                <ProductCard product={r} />
              </li>
            ))}
          </ul>
        </section>
      )}

      <JsonLd data={productLd(p)} />
      <JsonLd
        data={breadcrumbLd([
          { name: "Home", path: "/" },
          { name: "Shop", path: "/shop" },
          { name: p.name, path: `/perfume/${p.slug}` },
        ])}
      />
    </>
  );

  return themeSign ? (
    <ZodiacScope sign={themeSign} page>
      {body}
    </ZodiacScope>
  ) : (
    body
  );
}

function Section({ title, children, open = false }: { title: string; children: React.ReactNode; open?: boolean }) {
  return (
    <details className="group py-4" open={open}>
      <summary className="font-caps text-fg flex cursor-pointer list-none items-center justify-between py-1 text-xs tracking-[0.22em] uppercase [&::-webkit-details-marker]:hidden">
        {title}
        <ChevronDown className="size-4 transition-transform duration-300 group-open:rotate-180" aria-hidden />
      </summary>
      <div className="text-muted pt-3 text-sm">{children}</div>
    </details>
  );
}
