import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { cacheLife } from "next/cache";
import { ArrowRight, ChevronDown, Gift, HelpCircle, ShieldCheck, Sparkles, Truck } from "lucide-react";
import { ELEMENT_INFO, ELEMENTS, ZODIAC } from "@/config/zodiac";
import { site } from "@/config/site";
import { currentSeasonSign, formatSignDates } from "@/lib/zodiac-math";
import { formatPrice } from "@/lib/money";
import { faqLd, JsonLd, organizationLd, websiteLd } from "@/lib/jsonld";
import { getProductBySlug, getProductCards } from "@/server/queries/catalog";
import { ZodiacWheel } from "@/components/zodiac/ZodiacWheel";
import { ZodiacScope } from "@/components/zodiac/ZodiacScope";
import { AmbientLayer } from "@/components/zodiac/AmbientLayer";
import { BottleArt } from "@/components/zodiac/BottleArt";
import { ProductCard } from "@/components/product/ProductCard";
import { Reveal } from "@/components/motion/Reveal";
import { Parallax } from "@/components/motion/Parallax";
import { Depth, PointerDepth } from "@/components/motion/PointerDepth";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { routes } from "@/lib/routes";

export const metadata: Metadata = {
  title: "Aaliqadr: Luxury Zodiac Perfumes & Extrait de Parfum | Crafted for Your Rashi",
  description:
    "Explore twelve luxury Extrait de Parfum signatures crafted for the twelve zodiac signs and Vedic rashis. 28% oil concentration for 12+ hour longevity. Free shipping across India.",
  keywords: [
    "zodiac perfume",
    "rashi perfume",
    "luxury perfume India",
    "extrait de parfum",
    "long lasting perfume",
    "astrology fragrance",
    "zodiac birthday gift",
    "discovery coffret perfume",
    "scent for your rashi",
    "niche fragrance India",
    "perfume for aries leo scorpio",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    title: "Aaliqadr: Luxury Zodiac Perfumes & Extrait de Parfum",
    description:
      "Twelve bespoke signatures, one for every rashi. Extrait de Parfum with 28% concentration made in India.",
    url: "/",
  },
};

const HOME_FAQS = [
  {
    question: "How do I choose the right perfume for my zodiac sign or Vedic rashi?",
    answer:
      "Every Aaliqadr fragrance is formulated around the element (Fire, Earth, Air, Water), ruling planet, and temperament of its sign. You can find your fragrance by selecting your Western sun sign or your Vedic Chandra rashi using our Find My Sign calculator, or simply by exploring the notes of your ruling element.",
  },
  {
    question: "What is the difference between Extrait de Parfum and Eau de Parfum (EDP)?",
    answer:
      "Extrait de Parfum is the highest concentration of fragrance in fine perfumery, containing 20% to 30% pure perfume oils (Aaliqadr formulations feature 28% concentration). Standard Eau de Parfum (EDP) contains only 12% to 18%. This concentration ensures rich scent evolution and 12+ hours of wear time on skin and textiles.",
  },
  {
    question: "How long does Aaliqadr Extrait de Parfum last on skin and fabric?",
    answer:
      "Due to our 28% oil concentration and artisanal maceration in small batches, Aaliqadr Extraits last 12 to 16 hours on skin and up to 24 hours on natural fabric, with strong yet refined projection and lasting sillage.",
  },
  {
    question: "Can I gift a zodiac perfume if I don't know the recipient's fragrance preferences?",
    answer:
      "Yes. A zodiac fragrance is one of the most thoughtful, personalized gifts because it is chosen based on birth date and astrological identity rather than random guesswork. Each bottle comes in a presentation box with an astrological profile card and complimentary handwritten gift message.",
  },
  {
    question: "Can I try all twelve zodiac perfumes before committing to a full bottle?",
    answer:
      "Yes! Our Zodiac Discovery Coffret features luxury miniature flacons of all twelve signatures. It allows you to explore the full astrological wheel, layer compatible signs, and find your favorite signature from home.",
  },
  {
    question: "Are Aaliqadr perfumes IFRA compliant and skin-safe?",
    answer:
      "All Aaliqadr fragrances are formulated with premium botanical extracts and safe aroma molecules in compliance with International Fragrance Association (IFRA) standards. They are cruelty-free, paraben-free, and bottled with genuine batch numbers in India.",
  },
];

export default function HomePage() {
  return (
    <>
      <Hero />
      <SeasonSpotlight />
      <Signatures />
      <Elements />
      <Coffret />
      <Craft />
      <HomeFaq />
      <Trust />
      <JsonLd data={websiteLd()} />
      <JsonLd data={organizationLd()} />
      <JsonLd data={faqLd(HOME_FAQS)} />
    </>
  );
}

function Hero() {
  return (
    <PointerDepth className="grain vignette relative isolate overflow-clip">
      <Depth strength={-26} className="absolute inset-0 -z-10">
        <div aria-hidden className="aurora" />
      </Depth>
      <div className="mx-auto grid min-h-[calc(100dvh-5rem)] max-w-[1360px] grid-cols-1 items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:py-10">
        <Parallax speed={-0.18}>
          <Depth strength={6} className="flex flex-col items-start gap-7">
            <p className="eyebrow">Extrait de Parfum · Twelve signs · Made in India</p>
            <h1 className="font-display text-[clamp(2.75rem,7vw,6.25rem)] leading-[0.95] tracking-tight">
              A fragrance
              <br />
              <em className="text-foil animate-shimmer not-italic">written in your stars</em>
            </h1>
            <p className="text-muted max-w-md text-base leading-relaxed sm:text-lg">
              Twelve signatures, one for every rashi. Each composed around the element, planet and temperament of its sign.
            </p>
            <div className="flex flex-wrap gap-3">
              <ButtonLink href="/find-my-sign">
                Find my sign <ArrowRight className="size-4" />
              </ButtonLink>
              <ButtonLink href="/zodiac" variant="ghost">
                Explore the zodiac
              </ButtonLink>
            </div>
          </Depth>
        </Parallax>
        <Parallax speed={0.22}>
          <Depth strength={16}>
            <ZodiacWheel />
          </Depth>
        </Parallax>
      </div>
    </PointerDepth>
  );
}

/** The sign currently in season. Cached for a day so it changes on its own at each ingress. */
async function SeasonSpotlight() {
  "use cache";
  cacheLife("days");
  const sign = currentSeasonSign(new Date());
  const product = await getProductBySlug(sign.fragrance.slug);
  const from = product?.variants.reduce((m, v) => Math.min(m, v.priceP), Number.POSITIVE_INFINITY);
  return (
    <ZodiacScope sign={sign.slug} className="overflow-clip">
      <Parallax speed={-0.45} className="absolute inset-x-0 -inset-y-28 -z-10">
        <AmbientLayer sign={sign.slug} intensity={0.7} />
      </Parallax>
      <div className="mx-auto grid max-w-[1360px] grid-cols-1 items-center gap-10 px-4 py-24 sm:px-6 md:grid-cols-2 lg:py-32">
        <Reveal className="order-2 flex flex-col items-start gap-5 md:order-1">
          <p className="eyebrow">
            It&apos;s {sign.name} season · {formatSignDates(sign)}
          </p>
          <h2 className="font-display text-5xl leading-none sm:text-6xl">{sign.fragrance.name}</h2>
          <p className="text-muted max-w-md text-lg">{sign.fragrance.tagline}.</p>
          <ul className="flex flex-wrap gap-2 text-sm">
            {[sign.element, sign.rulingPlanet, sign.fragrance.mood].map((t) => (
              <li key={t} className="rounded-full border border-[var(--glass-border)] px-3 py-1 capitalize">
                {t}
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap items-center gap-4 pt-2">
            <ButtonLink href={routes.product(sign.fragrance.slug)}>
              Discover {sign.name}
              {from && Number.isFinite(from) ? ` · from ${formatPrice(from)}` : ""}
            </ButtonLink>
            <Link href={routes.sign(sign.slug)} className="text-muted hover:text-fg text-sm underline-offset-4 hover:underline">
              Read the {sign.name} story
            </Link>
          </div>
        </Reveal>
        <Reveal className="order-1 mx-auto w-full max-w-xs md:order-2 md:max-w-sm" delay={0.1}>
          <Parallax speed={0.35}>
            <PointerDepth>
              <Depth strength={18}>
                <BottleArt sign={sign.slug} preload className="animate-float drop-shadow-[0_30px_60px_rgba(0,0,0,.55)]" />
              </Depth>
            </PointerDepth>
          </Parallax>
        </Reveal>
      </div>
    </ZodiacScope>
  );
}

async function Signatures() {
  const cards = (await getProductCards()).filter((p) => p.type === "fragrance");
  return (
    <section className="mx-auto max-w-[1360px] px-4 py-24 sm:px-6">
      <Reveal className="mb-12 flex flex-col items-center gap-4 text-center">
        <Parallax speed={-0.12} className="flex flex-col items-center gap-4">
          <p className="eyebrow">The Signatures</p>
          <h2 className="font-display text-4xl sm:text-5xl">Twelve signs. Twelve stories.</h2>
          <p className="text-muted max-w-xl">
            Every bottle is rendered in the colours of its sign. Choose by your rashi, or simply by the notes you love.
          </p>
        </Parallax>
      </Reveal>
      <ul className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
        {cards.map((p, i) => (
          <li key={p.id}>
            <ProductCard product={p} priority={i < 2} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function Elements() {
  const ambient = { fire: "aries", earth: "taurus", air: "libra", water: "pisces" } as const;
  return (
    <section className="mx-auto max-w-[1360px] px-4 py-16 sm:px-6">
      <Reveal className="mb-10 flex flex-col gap-3">
        <p className="eyebrow">Shop by element</p>
        <h2 className="font-display text-3xl sm:text-4xl">Fire, Earth, Air, Water</h2>
      </Reveal>
      <ul className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {ELEMENTS.map((el, i) => {
          const info = ELEMENT_INFO[el];
          return (
            <Reveal as="li" key={el} delay={i * 0.08}>
              <Link
                href={`/shop?element=${el}`}
                data-zodiac={ambient[el]}
                data-element={el}
                className="surface group relative flex min-h-40 flex-col justify-end gap-1.5 overflow-clip p-4 sm:min-h-56 sm:gap-2 sm:p-6"
              >
                <div
                  aria-hidden
                  className="absolute inset-0 -z-10 opacity-70 transition-opacity duration-700 group-hover:opacity-100"
                  style={{ background: "radial-gradient(90% 80% at 80% 0%, var(--z-g2), transparent 70%)" }}
                />
                <span className="flex gap-1 text-lg sm:gap-2 sm:text-2xl" style={{ color: "var(--z-primary)" }} aria-hidden>
                  {info.signs.map((s) => `${ZODIAC[s].glyph}︎`).join(" ")}
                </span>
                <h3 className="font-display text-xl sm:text-3xl">{info.label}</h3>
                <p className="line-clamp-2 text-xs text-muted sm:text-sm">{info.scent}</p>
                <span className="text-accent mt-1 inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.18em] sm:mt-2 sm:text-xs">
                  Shop {info.label.toLowerCase()} <ArrowRight className="size-3 transition-transform group-hover:translate-x-1" />
                </span>
              </Link>
            </Reveal>
          );
        })}
      </ul>
    </section>
  );
}

async function Coffret() {
  const p = await getProductBySlug("zodiac-discovery-coffret");
  if (!p) return null;
  const v = p.variants[0];
  return (
    <section className="mx-auto max-w-[1360px] px-4 py-16 sm:px-6">
      <Reveal className="surface relative grid grid-cols-1 items-center gap-8 overflow-clip p-8 sm:p-12 md:grid-cols-[1fr_auto]">
        <Parallax speed={-0.4} className="absolute inset-x-0 -inset-y-24 -z-10">
          <div aria-hidden className="aurora opacity-60" />
        </Parallax>
        <div className="flex flex-col gap-4">
          <p className="eyebrow">Not sure yet?</p>
          <h2 className="font-display text-4xl sm:text-5xl">{p.name}</h2>
          <p className="text-muted max-w-xl">{p.tagline}.</p>
        </div>
        <div className="flex flex-col items-start gap-3 md:items-end">
          {v && <span className="font-display text-3xl">{formatPrice(v.priceP)}</span>}
          <ButtonLink href={routes.product(p.slug)}>
            <Gift className="size-4" /> Explore the coffret
          </ButtonLink>
        </div>
      </Reveal>
    </section>
  );
}

function Craft() {
  return (
    <section className="mx-auto grid max-w-[1360px] grid-cols-1 items-center gap-12 px-4 py-24 sm:px-6 md:grid-cols-2">
      <Reveal className="mx-auto w-full max-w-md">
        <Parallax speed={0.3} className="relative aspect-square w-full">
          <Image
            src="/brand/logo-embossed-ivory.png"
            alt="The Aaliqadr monogram embossed on ivory card"
            fill
            quality={85}
            sizes="(min-width: 768px) 40vw, 90vw"
            className="object-contain drop-shadow-[0_40px_60px_rgba(0,0,0,.5)]"
          />
        </Parallax>
      </Reveal>
      <Reveal className="flex flex-col gap-5" delay={0.1}>
        <p className="eyebrow">Our craft</p>
        <h2 className="font-display text-4xl sm:text-5xl">The drop that holds a sky</h2>
        <p className="text-muted leading-relaxed">
          Our monogram joins the letters alif and qaf into a single drop of perfume, shaped like a flame. {site.name} means high esteem: we
          compose every signature as an Extrait de Parfum, with a concentration made to stay with you from morning to the last star.
        </p>
        <ButtonLink href="/about" variant="ghost" className="self-start">
          Read our story
        </ButtonLink>
      </Reveal>
    </section>
  );
}

function HomeFaq() {
  return (
    <section className="mx-auto max-w-4xl px-4 py-20 sm:px-6">
      <Reveal className="mb-12 flex flex-col items-center gap-3 text-center">
        <p className="eyebrow flex items-center gap-1.5">
          <HelpCircle className="size-3.5 text-gold" /> Frequently asked questions
        </p>
        <h2 className="font-display text-4xl sm:text-5xl">Understanding Aaliqadr</h2>
        <p className="text-muted max-w-xl text-sm sm:text-base">
          Astrology, fragrance concentrations, and gifting guidance crafted to help you find your celestial signature.
        </p>
      </Reveal>
      <div className="divide-y divide-white/10 rounded-2xl border border-white/10 bg-white/[0.02] p-6 sm:p-8">
        {HOME_FAQS.map((faq, i) => (
          <details key={faq.question} className="group py-5 first:pt-0 last:pb-0" open={i === 0}>
            <summary className="font-display flex cursor-pointer list-none items-center justify-between text-left text-lg text-fg transition-colors hover:text-gold [&::-webkit-details-marker]:hidden">
              <span className="pr-4">{faq.question}</span>
              <ChevronDown className="size-4 shrink-0 text-muted transition-transform duration-300 group-open:rotate-180" aria-hidden />
            </summary>
            <p className="text-muted mt-3 text-sm leading-relaxed">{faq.answer}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

function Trust() {
  const items = [
    { Icon: Sparkles, title: "Extrait de Parfum", text: "20–30% concentration" },
    { Icon: Truck, title: "Free shipping", text: `On orders above ${formatPrice(site.freeShippingAboveP)}` },
    { Icon: ShieldCheck, title: "Secure payments", text: "UPI, cards, netbanking & COD" },
    { Icon: Gift, title: "Gift ready", text: "Wrap and a handwritten note" },
  ];
  return (
    <section className="border-y border-white/5">
      <ul className="mx-auto grid max-w-[1360px] grid-cols-2 gap-6 px-4 py-10 sm:px-6 lg:grid-cols-4">
        {items.map(({ Icon, title, text }) => (
          <li key={title} className="flex items-center gap-4">
            <Icon className="text-gold size-6 shrink-0" strokeWidth={1.25} aria-hidden />
            <div>
              <p className="text-sm font-medium">{title}</p>
              <p className="text-muted text-xs">{text}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
