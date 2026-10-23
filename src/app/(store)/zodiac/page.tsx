import type { Metadata } from "next";
import Link from "next/link";
import { ELEMENT_INFO, ELEMENTS, ZODIAC } from "@/config/zodiac";
import { formatSignDates } from "@/lib/zodiac-math";
import { breadcrumbLd, collectionPageLd, JsonLd } from "@/lib/jsonld";
import { Reveal } from "@/components/motion/Reveal";
import { Glyph } from "@/components/zodiac/Glyph";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { PageHero } from "@/components/layout/PageHero";
import { Parallax } from "@/components/motion/Parallax";
import { routes } from "@/lib/routes";

export const metadata: Metadata = {
  title: "The Zodiac Fragrance Guide: 12 Rashis & Extrait de Parfum Signatures | Aaliqadr",
  description:
    "Explore all twelve signs of the zodiac and Vedic rashis paired with luxury Extrait de Parfum fragrances. Composed around Fire, Earth, Air, and Water elements with 28% oil concentration.",
  keywords: [
    "zodiac perfume guide",
    "12 rashi perfumes",
    "astrology fragrance guide",
    "fire element perfume",
    "earth element perfume",
    "air element perfume",
    "water element perfume",
    "perfume by rashi",
    "luxury astrological perfumes",
  ],
  alternates: { canonical: "/zodiac" },
  openGraph: {
    title: "The Zodiac Fragrance Guide: 12 Rashis & Extrait de Parfum Signatures",
    description: "Twelve signs, twelve signatures. Explore luxury Extrait de Parfum crafted for every rashi.",
    url: "/zodiac",
    type: "website",
  },
};

export default function ZodiacIndexPage() {
  return (
    <div className="relative">
      <PageHero eyebrow="The Zodiac" title="Twelve signs, twelve signatures" align="center">
        <p className="text-muted max-w-xl">
          Grouped by element, because that is where a fragrance begins. Know your rashi? Go straight to it. Not sure?
        </p>
        <ButtonLink href="/find-my-sign" variant="ghost">
          Find my sign
        </ButtonLink>
      </PageHero>
      <div className="mx-auto flex max-w-[1360px] flex-col gap-16 px-4 pb-24 sm:px-6">
        {ELEMENTS.map((el) => {
          const info = ELEMENT_INFO[el];
          return (
            <section key={el} aria-labelledby={`el-${el}`}>
              <Reveal className="mb-6 flex flex-wrap items-baseline justify-between gap-2">
                <h2 id={`el-${el}`} className="font-display text-4xl">
                  {info.label} signs
                </h2>
                <p className="text-muted text-sm">{info.scent}</p>
              </Reveal>
              <ul className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3">
                {info.signs.map((slug, i) => {
                  const s = ZODIAC[slug];
                  return (
                    <Reveal as="li" key={slug} delay={i * 0.08}>
                      <Parallax speed={0.04 + i * 0.07}>
                        <Link
                          href={routes.sign(slug)}
                          data-zodiac={slug}
                          data-element={el}
                          className="surface group relative flex min-h-48 flex-col justify-between gap-4 overflow-clip p-4 sm:min-h-64 sm:gap-6 sm:p-7"
                        >
                          <div
                            aria-hidden
                            className="absolute inset-0 -z-10 opacity-60 transition-opacity duration-700 group-hover:opacity-100"
                            style={{ background: "radial-gradient(100% 80% at 100% 0%, var(--z-g2), transparent 65%)" }}
                          />
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="eyebrow !text-[0.6rem] sm:!text-[0.72rem]">{s.rashi}</p>
                              <h3 className="font-display mt-1 text-2xl sm:mt-2 sm:text-4xl">{s.name}</h3>
                              <p className="text-muted mt-1 text-[10px] sm:text-xs">{formatSignDates(s)}</p>
                            </div>
                            <Glyph
                              sign={slug}
                              label={false}
                              className="ease-lux text-3xl transition-transform duration-700 group-hover:rotate-12 sm:text-5xl"
                            />
                          </div>
                          <div>
                            <p className="text-muted text-xs sm:text-sm">Signature</p>
                            <p className="font-display text-base sm:text-2xl" style={{ color: "var(--z-primary)" }}>
                              {s.fragrance.name}
                            </p>
                          </div>
                        </Link>
                      </Parallax>
                    </Reveal>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>
      <JsonLd
        data={breadcrumbLd([
          { name: "Home", path: "/" },
          { name: "The Zodiac", path: "/zodiac" },
        ])}
      />
      <JsonLd
        data={collectionPageLd({
          name: "The Zodiac Signatures",
          description: "Twelve luxury Extrait de Parfum fragrances composed for the twelve signs of the zodiac and Vedic rashis.",
          path: "/zodiac",
          items: Object.values(ZODIAC).map((s) => ({
            name: `${s.name} (${s.rashi}): ${s.fragrance.name}`,
            path: `/zodiac/${s.slug}`,
          })),
        })}
      />
    </div>
  );
}
