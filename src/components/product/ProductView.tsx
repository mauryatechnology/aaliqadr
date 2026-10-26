import Link from "next/link";
import { ChevronDown, CreditCard, RotateCcw, ShieldCheck, Star, Tag, Truck } from "lucide-react";
import { ELEMENT_INFO, ZODIAC, type ZodiacSlug } from "@/config/zodiac";
import { site } from "@/config/site";
import { formatPrice } from "@/lib/money";
import { breadcrumbLd, faqLd, JsonLd, productLd } from "@/lib/jsonld";
import type { ProductDTO } from "@/server/catalog/types";
import { BADGES } from "@/server/catalog/types";
import { getCategories, getProductCards } from "@/server/queries/catalog";
import { ZodiacScope } from "@/components/zodiac/ZodiacScope";
import { AmbientLayer } from "@/components/zodiac/AmbientLayer";
import { BottleArt } from "@/components/zodiac/BottleArt";
import { Glyph } from "@/components/zodiac/Glyph";
import { NotesPyramid } from "@/components/product/NotesPyramid";
import { ScentProfile } from "@/components/product/ScentProfile";
import { VariantPicker } from "@/components/product/VariantPicker";
import { ProductStateProvider } from "@/components/product/ProductState";
import { ProductGallery } from "@/components/product/ProductGallery";
import { APlusBlocks } from "@/components/product/APlusBlocks";
import { ProductReviews } from "@/components/product/ProductReviews";
import { RecentlyViewed } from "@/components/product/RecentlyViewed";
import { RelatedProductCard } from "@/components/product/RelatedProductCard";
import { Reveal } from "@/components/motion/Reveal";
import { Parallax } from "@/components/motion/Parallax";
import { Depth } from "@/components/motion/Depth";
import { PointerDepth } from "@/components/motion/PointerDepth";
import { routes } from "@/lib/routes";
import { getLiveOffers } from "@/server/queries/offers";
import { getStorefrontSettings } from "@/server/queries/storefront-settings";
import { getBoughtTogether } from "@/server/queries/recommendations";
import { DeliveryEstimate, ShareButton, StockNotify } from "@/components/product/BuyExtras";
import { WishlistButton } from "@/components/product/WishlistButton";
import { AddTogether } from "@/components/product/BoughtTogether";
import { ProductQuestions } from "@/components/product/ProductQuestions";


/**
 * The product page body (docs/09 §4.3). Shared by the store page and the staff preview
 * (plan.md §8.5), which passes `preview` to leave out reviews, history and structured data.
 */
export async function ProductView({ p, preview = false }: { p: ProductDTO; preview?: boolean }) {
  const themeSign = themeSignFor(p);
  const sign = p.zodiacSign ? ZODIAC[p.zodiacSign] : undefined;
  const [cards, categories, settings, offers, together] = await Promise.all([getProductCards(), getCategories(), getStorefrontSettings(), getLiveOffers(), preview ? [] : getBoughtTogether(p.id)]);
  // Related: compatible signs first (fragrances), then the same category.
  const related = [
    ...(p.compatibleSigns ?? []).map((c) => cards.find((x) => x.zodiacSign === c && x.type === "fragrance")),
    ...cards.filter((x) => x.categoryId && x.categoryId === p.categoryId),
  ]
    .filter((x): x is (typeof cards)[number] => !!x && x.slug !== p.slug)
    .filter((x, i, all) => all.findIndex((y) => y.id === x.id) === i)
    .slice(0, 4);
  // Body care and accessories of the same sign (plan.md §10.3).
  const ritual = p.zodiacSign ? cards.filter((x) => x.zodiacSign === p.zodiacSign && x.id !== p.id && (x.type === "body_care" || x.type === "accessory")).slice(0, 4) : [];
  const byId = new Map(categories.map((c) => [c.id, c]));
  const trail: typeof categories = [];
  for (let c = p.categoryId ? byId.get(p.categoryId) : undefined; c && trail.length < 4; c = c.parentId ? byId.get(c.parentId) : undefined) trail.unshift(c);
  const active = p.variants.filter((v) => v.isActive);
  const cover = p.media.find((m) => m.kind === "image");

  const hasNotes = Boolean(
    p.notes &&
    p.display.notes &&
    ((p.notes.top && p.notes.top.length > 0) ||
     (p.notes.heart && p.notes.heart.length > 0) ||
     (p.notes.base && p.notes.base.length > 0))
  );

  const hasProfile = Boolean(
    p.profile &&
    p.display.profile &&
    (p.profile.intensity > 0 || (p.profile.longevityHours && p.profile.longevityHours[1] > 0))
  );

  const hasIncludes = Boolean(p.includes && p.includes.length > 0);

  const body = (
    <>
      <PointerDepth className="relative overflow-clip">
        <Parallax speed={-0.5} className="absolute inset-x-0 -inset-y-32 -z-10 [mask-image:linear-gradient(to_bottom,black_60%,transparent_100%)]">
          <Depth strength={-20} className="absolute inset-0">
            <AmbientLayer sign={themeSign} intensity={0.6} />
          </Depth>
        </Parallax>
        <ProductStateProvider variants={p.variants}>
        <div className="mx-auto grid max-w-[1360px] grid-cols-1 gap-10 px-4 py-10 sm:px-6 lg:grid-cols-[1.1fr_1fr] lg:gap-16 lg:py-16">
          {/* Gallery */}
          <div className="lg:sticky lg:top-24 lg:self-start">
            <ProductGallery
              media={p.media}
              imageAxis={p.imageAxis}
              sharedAfterVariant={p.display.sharedAfterVariant}
              name={p.name}
              viewTransitionName={`product-${p.slug}`}
              fallback={
                <Parallax speed={0.18} className="w-1/2 max-w-xs">
                  <Depth strength={22}>
                    <BottleArt sign={sign?.slug} preload className="animate-float drop-shadow-[0_30px_70px_rgba(0,0,0,.6)]" />
                  </Depth>
                </Parallax>
              }
            />
          </div>

          {/* Buy box */}
          <div className="flex flex-col gap-7">
            <nav aria-label="Breadcrumb" className="text-muted flex flex-wrap gap-x-1 text-xs">
              <Link href="/shop" className="hover:text-fg">Shop</Link>
              {trail.map((c) => (
                <span key={c.id}>
                  <span aria-hidden>/ </span>
                  <Link href={routes.category(c.slug)} className="hover:text-fg">{c.name}</Link>
                </span>
              ))}
              {sign && (
                <span>
                  <span aria-hidden>/ </span>
                  <Link href={routes.sign(sign.slug)} className="hover:text-fg">{sign.name}</Link>
                </span>
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
                  (trail.at(-1)?.name ?? p.legal.genericName)
                )}
              </p>
              <h1 className="font-display text-5xl leading-none sm:text-6xl">{p.name}</h1>
              {p.tagline && <p className="text-muted text-lg">{p.tagline}.</p>}
              {(p.ratingCount > 0 || p.badges.length > 0) && (
                <div className="flex flex-wrap items-center gap-3">
                  {p.ratingCount > 0 && (
                    <a href="#reviews" className="flex items-center gap-1.5 text-sm hover:text-accent">
                      <span className="flex" aria-hidden>
                        {[1, 2, 3, 4, 5].map((n) => <Star key={n} className="size-4" style={{ color: "var(--z-primary)" }} fill={n <= Math.round(p.ratingAvg) ? "currentColor" : "none"} />)}
                      </span>
                      <span>{p.ratingAvg.toFixed(1)} · {p.ratingCount} review{p.ratingCount === 1 ? "" : "s"}</span>
                    </a>
                  )}
                  {p.badges.map((b) => (
                    <span key={b} className="rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.16em]" style={{ borderColor: "var(--glass-border)" }}>{BADGES[b]}</span>
                  ))}
                </div>
              )}
            </div>

            <VariantPicker slug={p.slug} name={p.name} options={p.options} media={p.media} imageAxis={p.imageAxis} sharedAfterVariant={p.display.sharedAfterVariant} />
            <StockNotify />

            {offers.length > 0 && (
              <ul aria-label="Offers" className="flex flex-col gap-2">
                {offers.map((o) => (
                  <li key={o.code} className="flex items-center gap-2 rounded-xl border border-dashed border-gold/40 px-3 py-2 text-sm">
                    <Tag className="size-4 shrink-0 text-accent" aria-hidden />
                    <span>
                      Use <strong className="font-mono tracking-wider text-gold-light">{o.code}</strong> for {o.text}
                      {o.minSubtotalP > 0 && <span className="text-muted"> on orders above {formatPrice(o.minSubtotalP)}</span>}
                    </span>
                  </li>
                ))}
              </ul>
            )}

            <DeliveryEstimate zones={settings.delivery} storeStateCode={settings.storeStateCode} codEnabled={settings.codEnabled} codMaxOrderP={settings.codMaxOrderP} />
            <p className="text-sm text-muted">Gift wrap with a handwritten note{settings.giftWrapP ? ` for ${formatPrice(settings.giftWrapP)}` : ""}, and prices hidden in the parcel, at checkout.</p>
            <div className="flex items-center gap-4">
              <WishlistButton slug={p.slug} name={p.name} size="lg" />
              <ShareButton name={p.name} slug={p.slug} />
            </div>

            <ul className="text-muted grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
              <li className="flex items-center gap-2">
                <Truck className="text-accent size-4" aria-hidden /> Free shipping above {formatPrice(settings.freeShippingAboveP)}
              </li>
              <li className="flex items-center gap-2">
                <CreditCard className="text-accent size-4" aria-hidden /> Secure payment: UPI, cards, net banking{settings.codEnabled ? ", COD" : ""}
              </li>
              <li className="flex items-center gap-2">
                <ShieldCheck className="text-accent size-4" aria-hidden /> Sealed, authentic, batch-coded
              </li>
              <li className="flex items-center gap-2">
                <RotateCcw className="text-accent size-4" aria-hidden /> Damaged in transit? Replaced free
              </li>
            </ul>

            <div className="hairline" />

            <div className="flex flex-col divide-y divide-white/10">
              <Section title={p.type === "fragrance" ? "The story" : "Description"} open>
                {p.descriptionHtml ? (
                  <div className="rich-text" dangerouslySetInnerHTML={{ __html: p.descriptionHtml }} />
                ) : (
                  <p className="leading-relaxed">{p.description}</p>
                )}
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
              {p.display.specs && p.specs.length > 0 && (
                <Section title="Specifications">
                  <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2">
                    {p.specs.map((x) => (
                      <div key={x.label} className="contents">
                        <dt>{x.label}</dt>
                        <dd className="text-fg">{x.value}</dd>
                      </div>
                    ))}
                  </dl>
                </Section>
              )}
              <Section title="Details & legal">
                <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2">
                  <dt>Product</dt>
                  <dd className="text-fg">{p.legal.genericName}</dd>
                  <dt>Net quantity</dt>
                  <dd className="text-fg">
                    {active.map((v) => (v.volumeMl ? `${v.volumeMl} ml` : v.label)).join(" / ")}
                  </dd>
                  <dt>MRP</dt>
                  <dd className="text-fg">
                    {active.map((v) => `${formatPrice(v.mrpP)} (${v.label})`).join(", ")}
                    , inclusive of all taxes
                  </dd>
                  <dt>Manufactured by</dt>
                  <dd className="text-fg">{p.legal.manufacturer}</dd>
                  {p.legal.packer && (
                    <>
                      <dt>Packed / marketed by</dt>
                      <dd className="text-fg">{p.legal.packer}</dd>
                    </>
                  )}
                  <dt>Country of origin</dt>
                  <dd className="text-fg">{p.legal.countryOfOrigin}</dd>
                  <dt>Mfg. date & batch</dt>
                  <dd className="text-fg">As printed on the pack</dd>
                </dl>
                {p.type !== "accessory" && <p className="mt-4 text-xs">Flammable. Keep away from heat and flame. For external use only. Avoid contact with eyes.</p>}
              </Section>
              <Section title="Shipping & returns">
                <p className="leading-relaxed">
                  Dispatched in {settings.delivery.dispatch[0]}–{settings.delivery.dispatch[1]} working days. Free shipping above {formatPrice(settings.freeShippingAboveP)}. Opened perfume can&apos;t be returned, but if it arrives damaged, leaked or wrong, report it from your order within {settings.returnWindowHours} hours of delivery with an unboxing video and we&apos;ll replace or refund it.
                </p>
                <p className="mt-3 flex flex-wrap gap-4 text-xs">
                  <Link href={routes.policy("shipping")} className="underline underline-offset-4 hover:text-fg">Shipping policy</Link>
                  <Link href={routes.policy("returns")} className="underline underline-offset-4 hover:text-fg">Returns & refunds</Link>
                </p>
              </Section>
            </div>
          </div>
        </div>
        </ProductStateProvider>
      </PointerDepth>

      {hasNotes && (
        <section className="mx-auto max-w-4xl px-4 py-20 text-center sm:px-6">
          <Reveal className="mb-10 flex flex-col items-center gap-3">
            <p className="eyebrow text-gold-light/90 tracking-[0.26em]">Olfactive pyramid</p>
            <h2 className="font-display text-4xl sm:text-5xl text-ivory drop-shadow-[0_2px_20px_rgba(0,0,0,0.6)]">How it unfolds</h2>
            <p className="text-ivory/80 max-w-lg text-sm sm:text-base font-light">
              Crafted in three unfolding tiers from first luminous spark to enduring skin scent.
            </p>
          </Reveal>
          <NotesPyramid notes={p.notes!} />
          <WearTimeline notes={p.notes!} />
          {hasProfile && (
            <Reveal className="surface mt-12 p-6 text-left sm:p-8">
              <ScentProfile profile={p.profile!} />
              <p className="text-ivory/85 mt-6 text-sm font-light">
                Best experienced in <span className="text-gold-light font-medium capitalize">{p.profile!.season.join(" & ").toLowerCase()}</span>, <span className="text-gold-light font-medium">{p.profile!.timeOfDay.join(" or ")}</span>.
              </p>
            </Reveal>
          )}
        </section>
      )}

      {!hasNotes && hasIncludes && (
        <section className="mx-auto max-w-5xl px-4 py-20 text-center sm:px-6">
          <Reveal className="mb-12 flex flex-col items-center gap-3">
            <p className="eyebrow text-gold-light/90 tracking-[0.26em]">The Discovery Collection</p>
            <h2 className="font-display text-4xl sm:text-5xl text-ivory drop-shadow-[0_2px_20px_rgba(0,0,0,0.6)]">
              {p.type === "bundle" ? "Twelve signatures to explore" : "Included in this set"}
            </h2>
            <p className="text-ivory/80 max-w-xl text-sm sm:text-base font-light">
              {p.type === "bundle"
                ? "Every zodiac Extrait de Parfum in generous 2 ml spray atomisers. Experience one rashi a day and let your skin decide."
                : `${p.tagline}. Handcrafted luxury Extraits curated together.`}
            </p>
          </Reveal>
          <ul className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
            {p.includes!.map((item) => (
              <li
                key={item.name}
                className="surface group relative flex flex-col items-start gap-1 p-4 sm:p-5 text-left transition-all duration-300 hover:-translate-y-1 hover:border-gold/50 hover:shadow-lg"
              >
                <span className="text-base sm:text-lg font-medium text-ivory group-hover:text-gold-light transition-colors">
                  {item.name}
                </span>
                <span className="text-xs text-ivory/70 font-light">{item.detail}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {p.aPlus && p.aPlus.length > 0 && <APlusBlocks blocks={p.aPlus} />}

      {together.length > 0 && p.variants.some((v) => v.isActive && v.stock > 0) && (
        <section className="mx-auto max-w-[1360px] px-4 py-12 sm:px-6">
          <Reveal className="mb-6 flex flex-col gap-2">
            <p className="eyebrow">Often bought together</p>
            <h2 className="font-display text-3xl">Pair it</h2>
          </Reveal>
          <ul className="mb-6 grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
            {together.map((r) => (
              <li key={r.id}>
                <RelatedProductCard product={r} />
              </li>
            ))}
          </ul>
          {(() => {
            const self = p.variants.filter((v) => v.isActive && v.stock > 0).toSorted((a, b) => a.priceP - b.priceP)[0]!;
            const items = [{ slug: p.slug, sku: self.sku, name: p.name, priceP: self.priceP, maxPerOrder: self.maxPerOrder }, ...together.map((t) => { const q = t.quickVariants.find((v) => v.sku === t.defaultSku)!; return { slug: t.slug, sku: q.sku, name: t.name, priceP: q.priceP, maxPerOrder: q.maxPerOrder }; })];
            return <AddTogether items={items} />;
          })()}
        </section>
      )}

      {ritual.length > 0 && (
        <section className="mx-auto max-w-[1360px] px-4 py-12 sm:px-6">
          <Reveal className="mb-6 flex flex-col gap-2">
            <p className="eyebrow">Complete your ritual</p>
            <h2 className="font-display text-3xl">Layer it</h2>
          </Reveal>
          <ul className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
            {ritual.map((r) => (
              <li key={r.id}>
                <RelatedProductCard product={r} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {!preview && <ProductReviews productId={p.id} slug={p.slug} ratingAvg={p.ratingAvg} ratingCount={p.ratingCount} />}
      {!preview && settings.qaEnabled && <ProductQuestions productId={p.id} slug={p.slug} />}

      {related.length > 0 && (
        <section className="mx-auto max-w-[1360px] px-4 py-16 sm:px-6">
          <Reveal className="mb-10 flex flex-col gap-3">
            <p className="eyebrow">Pairs well with</p>
            <h2 className="font-display text-4xl">{sign ? "Compatible signs" : "You may also like"}</h2>
          </Reveal>
          <ul className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
            {related.map((r) => (
              <li key={r.id}>
                <RelatedProductCard product={r} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {!preview && (
        <>
          <RecentlyViewed current={{ slug: p.slug, name: p.name, priceP: active[0]?.priceP ?? 0, image: cover?.url, sign: p.zodiacSign }} />

          <JsonLd data={productLd(p)} />
          <JsonLd
            data={breadcrumbLd([
              { name: "Home", path: "/" },
              { name: "Shop", path: "/shop" },
              ...trail.map((c) => ({ name: c.name, path: `/category/${c.slug}` })),
              { name: p.name, path: `/perfume/${p.slug}` },
            ])}
          />
          <JsonLd data={faqLd(buildProductFaqs(p, sign))} />
        </>
      )}
    </>
  );

  return (
    <ZodiacScope sign={themeSign} page>
      {body}
    </ZodiacScope>
  );
}


export /** Fragrances use their sign; element trios borrow their element's first sign; bundles stay on zodiac wheel start (Aries). */
function themeSignFor(p: ProductDTO): ZodiacSlug {
  if (p.zodiacSign) return p.zodiacSign;
  const firstSign = p.element ? ELEMENT_INFO[p.element]?.signs[0] : undefined;
  if (firstSign) return firstSign;
  return "aries";
}

function buildProductFaqs(p: ProductDTO, sign?: (typeof ZODIAC)[keyof typeof ZODIAC]) {
  const notesStr = p.notes
    ? `Top notes of ${p.notes.top.map((n) => n.name).join(", ")}; heart notes of ${p.notes.heart.map((n) => n.name).join(", ")}; base notes of ${p.notes.base.map((n) => n.name).join(", ")}.`
    : "";

  if (sign) {
    return [
      {
        question: `What makes ${p.name} the signature fragrance for ${sign.name} (${sign.rashi})?`,
        answer: `${p.name} is formulated specifically for ${sign.name} (${sign.rashi}), reflecting its ${sign.element} element and ${sign.rulingPlanet} ruler. It captures the ${sign.fragrance.mood.toLowerCase()} essence with ${p.tagline.toLowerCase()}.`,
      },
      {
        question: `What is the concentration and longevity of ${p.name}?`,
        answer: `${p.name} is formulated as a luxury Extrait de Parfum with 28% oil concentration. It delivers 12 to 16 hours of continuous performance on skin, with prominent sillage and all-day projection.`,
      },
      ...(notesStr
        ? [
            {
              question: `What are the olfactive notes in ${p.name}?`,
              answer: `${notesStr} ${p.profile ? `Best worn during ${p.profile.season.join(" & ").toLowerCase()}, in the ${p.profile.timeOfDay.join(" or ")}.` : ""}`,
            },
          ]
        : []),
      {
        question: `How should I apply ${p.name} Extrait de Parfum for maximum projection?`,
        answer:
          "Apply 2–3 sprays to pulse points (inside wrists, behind ears, collarbones). Avoid rubbing wrists together, as this breaks down delicate top notes. Spraying on natural fabrics (cotton, linen, wool) extends longevity past 24 hours.",
      },
      {
        question: "Is shipping free across India and what is the return policy?",
        answer: `We offer complimentary delivery on all orders above ${formatPrice(site.freeShippingAboveP)}. Each bottle arrives in tamper-evident, sealed luxury packaging. If damaged in transit, report within 48 hours with an unboxing video for an immediate replacement.`,
      },
    ];
  }

  return [
    {
      question: `What is included in the ${p.name}?`,
      answer: p.description,
    },
    {
      question: `What is the concentration and longevity of the fragrances in ${p.name}?`,
      answer: "All included fragrances are full-strength Extrait de Parfum (28% concentration), offering 12+ hours of performance and genuine projection.",
    },
    {
      question: "Is this suitable as a gift?",
      answer: "Yes, it arrives in embossed gold foil gift packaging with dedicated fragrance blotting strips and personalized gift notes upon request.",
    },
    {
      question: "Is shipping free across India?",
      answer: `Orders above ${formatPrice(site.freeShippingAboveP)} receive complimentary express shipping across India.`,
    },
  ];
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

/** How the notes appear on skin over the day (plan.md §10.3). */
function WearTimeline({ notes }: { notes: NonNullable<ProductDTO["notes"]> }) {
  const stages = [
    { when: "First 15 minutes", what: "Opening", notes: notes.top },
    { when: "15 minutes – 3 hours", what: "Heart", notes: notes.heart },
    { when: "3 hours onwards", what: "Dry-down", notes: notes.base },
  ].filter((s) => s.notes.length);
  if (!stages.length) return null;
  return (
    <Reveal className="mt-14 text-left">
      <h3 className="font-display mb-6 text-center text-3xl text-ivory">How it wears through the day</h3>
      <ol className="relative grid grid-cols-1 gap-6 sm:grid-cols-3">
        {stages.map((s, i) => (
          <li key={s.what} className="surface relative p-5">
            <p className="eyebrow mb-1 text-gold-light/90">{i + 1} · {s.when}</p>
            <p className="font-display text-xl text-ivory">{s.what}</p>
            <p className="mt-2 text-sm text-ivory/80">{s.notes.map((n) => n.name).join(", ")}</p>
          </li>
        ))}
      </ol>
    </Reveal>
  );
}
