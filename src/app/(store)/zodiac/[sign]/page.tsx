import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { ELEMENT_INFO, ZODIAC, ZODIAC_SLUGS, isZodiacSlug } from "@/config/zodiac";
import { formatSignDates } from "@/lib/zodiac-math";
import { breadcrumbLd, faqLd, JsonLd } from "@/lib/jsonld";
import { getFragranceForSign, getProductCards } from "@/server/queries/catalog";
import { ZodiacScope } from "@/components/zodiac/ZodiacScope";
import { AmbientLayer } from "@/components/zodiac/AmbientLayer";
import { BottleArt } from "@/components/zodiac/BottleArt";
import { Glyph } from "@/components/zodiac/Glyph";
import { NotesPyramid } from "@/components/product/NotesPyramid";
import { ProductCard } from "@/components/product/ProductCard";
import { Price } from "@/components/product/Price";
import { Reveal } from "@/components/motion/Reveal";
import { Parallax } from "@/components/motion/Parallax";
import { Depth, PointerDepth } from "@/components/motion/PointerDepth";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { routes } from "@/lib/routes";

// Every param is prerendered, and the page (and its theme colour) is the URL's content, so a
// navigation waits for that prerendered page rather than flashing a shared skeleton.
export const instant = false;

export function generateStaticParams() {
  return ZODIAC_SLUGS.map((sign) => ({ sign }));
}

export async function generateMetadata({ params }: PageProps<"/zodiac/[sign]">): Promise<Metadata> {
  const { sign } = await params;
  if (!isZodiacSlug(sign)) return { title: "Not found", robots: { index: false } };
  const s = ZODIAC[sign];
  const title = `${s.name} (${s.rashi} Rashi) Perfume & Zodiac Scent Guide | Aaliqadr`;
  const description = `Discover ${s.fragrance.name}, the luxury Extrait de Parfum crafted for ${s.name} (${s.rashi}). Ruled by ${s.rulingPlanet} with the ${s.element} element. Key traits: ${s.traits.join(", ")}. 28% concentration for 12+ hour wear.`;
  const keywords = [
    `${s.name.toLowerCase()} perfume`,
    `${s.rashi.toLowerCase()} rashi perfume`,
    `fragrance for ${s.name.toLowerCase()}`,
    `${s.name.toLowerCase()} zodiac scent`,
    `perfume for ${s.rashi.toLowerCase()}`,
    `${s.element} sign perfume`,
    `birthday gift for ${s.name.toLowerCase()}`,
    `${s.fragrance.name.toLowerCase()}`,
    "extrait de parfum India",
  ];
  return {
    title,
    description,
    keywords,
    alternates: { canonical: `/zodiac/${sign}` },
    openGraph: {
      title,
      description,
      url: `/zodiac/${sign}`,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export async function generateViewport({ params }: PageProps<"/zodiac/[sign]">): Promise<Viewport> {
  const { sign } = await params;
  return { themeColor: isZodiacSlug(sign) ? ZODIAC[sign].theme.bg : "#0B0A0F" };
}

export default async function SignPage({ params }: PageProps<"/zodiac/[sign]">) {
  const { sign } = await params;
  if (!isZodiacSlug(sign)) notFound();
  const s = ZODIAC[sign];
  const product = await getFragranceForSign(sign);
  const cards = await getProductCards();
  const compatible = s.compatible.map((c) => cards.find((p) => p.zodiacSign === c)).filter((p) => p !== undefined);
  const element = ELEMENT_INFO[s.element];
  const fromPrice = product ? Math.min(...product.variants.map((v) => v.priceP)) : undefined;

  return (
    <ZodiacScope sign={sign} page>
      {/* Hero */}
      <PointerDepth className="grain vignette relative overflow-clip">
        <Parallax speed={-0.5} className="absolute inset-x-0 -inset-y-32 -z-10">
          <Depth strength={-22} className="absolute inset-0">
            <AmbientLayer sign={sign} />
          </Depth>
        </Parallax>
        <div className="mx-auto grid min-h-[calc(100dvh-5rem)] max-w-[1360px] grid-cols-1 items-center gap-10 px-4 py-16 sm:px-6 md:grid-cols-[1.1fr_1fr]">
          <Parallax speed={-0.2} className="flex flex-col items-start gap-6">
            <nav aria-label="Breadcrumb" className="text-muted text-xs">
              <Link href="/zodiac" className="hover:text-fg">
                The Zodiac
              </Link>{" "}
              <span aria-hidden>/</span> {s.name}
            </nav>
            <p className="eyebrow">
              {s.rashi} · {formatSignDates(s)} · {element.label}
            </p>
            <h1 className="font-display flex items-center gap-4 text-[clamp(3.5rem,10vw,8rem)] leading-[0.9]">
              <Glyph sign={sign} className="text-[0.7em]" label={false} />
              <span style={{ color: "var(--z-text)" }}>{s.name}</span>
            </h1>
            <p className="text-muted max-w-lg text-lg">
              {s.traits.join(" · ")}. Ruled by {s.rulingPlanet}, a {s.modality} {s.element} sign. Its fragrance:{" "}
              <span className="text-fg">{s.fragrance.name}</span>.
            </p>
            <div className="flex flex-wrap items-center gap-4">
              <ButtonLink href={routes.product(s.fragrance.slug)}>
                Discover {s.fragrance.name} <ArrowRight className="size-4" />
              </ButtonLink>
              {fromPrice !== undefined && <Price priceP={fromPrice} from />}
            </div>
          </Parallax>
          <Reveal className="mx-auto w-full max-w-xs sm:max-w-sm">
            <Parallax speed={0.3}>
              <Depth strength={20}>
                <BottleArt sign={sign} preload className="animate-float drop-shadow-[0_30px_70px_rgba(0,0,0,.6)]" />
              </Depth>
            </Parallax>
          </Reveal>
        </div>
      </PointerDepth>

      {/* Facts */}
      <section className="mx-auto max-w-[1360px] px-4 py-20 sm:px-6">
        <dl className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {[
            ["Element", element.label],
            ["Ruling planet", s.rulingPlanet],
            ["Modality", s.modality],
            ["Gemstone", s.gemstone],
          ].map(([k, v], i) => (
            <Reveal key={k} delay={i * 0.06} className="surface flex flex-col gap-2 p-6">
              <Parallax speed={0.06 + i * 0.05} className="flex flex-col gap-2">
                <dt className="eyebrow">{k}</dt>
                <dd className="font-display text-2xl capitalize">{v}</dd>
              </Parallax>
            </Reveal>
          ))}
        </dl>
      </section>

      {/* Notes */}
      <section className="mx-auto max-w-4xl px-4 py-12 text-center sm:px-6">
        <Reveal className="mb-10 flex flex-col items-center gap-3">
          <p className="eyebrow">The composition</p>
          <h2 className="font-display text-4xl sm:text-5xl">{s.fragrance.name}</h2>
          <p className="text-muted max-w-xl">
            {s.fragrance.tagline}. Mood: {s.fragrance.mood.toLowerCase()}.
          </p>
        </Reveal>
        <NotesPyramid notes={s.fragrance.notes} />
        <div className="mt-10">
          <ButtonLink href={routes.product(s.fragrance.slug)}>Choose your size</ButtonLink>
        </div>
      </section>

      {/* Compatible signs */}
      {compatible.length > 0 && (
        <section className="mx-auto max-w-[1360px] px-4 py-20 sm:px-6">
          <Reveal className="mb-10 flex flex-col gap-3">
            <p className="eyebrow">Pairs well with</p>
            <h2 className="font-display text-4xl">Signs that complete {s.name}</h2>
            <p className="text-muted max-w-xl">Gift a duo, or layer two signatures for a scent that is entirely yours.</p>
          </Reveal>
          <ul className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
            {compatible.map((p) => (
              <li key={p.id}>
                <ProductCard product={p} />
              </li>
            ))}
          </ul>
        </section>
      )}

      <JsonLd
        data={breadcrumbLd([
          { name: "Home", path: "/" },
          { name: "The Zodiac", path: "/zodiac" },
          { name: s.name, path: `/zodiac/${sign}` },
        ])}
      />
      <JsonLd
        data={faqLd([
          {
            question: `Why is ${s.fragrance.name} the ideal fragrance for ${s.name} (${s.rashi})?`,
            answer: `${s.name} is a ${s.modality} ${s.element} sign ruled by ${s.rulingPlanet}. ${s.fragrance.name} was composed specifically to echo its personality traits (${s.traits.join(", ")}) through ${s.fragrance.tagline.toLowerCase()}.`,
          },
          {
            question: `What are the olfactive notes of ${s.name}'s signature fragrance?`,
            answer: `Top notes of ${s.fragrance.notes.top.join(", ")}; heart notes of ${s.fragrance.notes.heart.join(", ")}; and base notes of ${s.fragrance.notes.base.join(", ")}.`,
          },
          {
            question: `Which zodiac signs are most compatible with ${s.name} for perfume pairing?`,
            answer: `${s.name} pairs exceptionally well with ${s.compatible.map((c) => ZODIAC[c].name).join(", ")}. Layering these fragrances creates a complementary celestial accord.`,
          },
          {
            question: `What is the wear time and concentration of ${s.fragrance.name}?`,
            answer: `Every Aaliqadr signature is composed as a full-strength Extrait de Parfum with 28% perfume oil concentration, providing 12 to 16 hours of longevity on skin.`,
          },
        ])}
      />
    </ZodiacScope>
  );
}
