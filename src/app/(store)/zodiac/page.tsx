import type { Metadata } from "next";
import Link from "next/link";
import { ELEMENT_INFO, ELEMENTS, ZODIAC } from "@/config/zodiac";
import { formatSignDates } from "@/lib/zodiac-math";
import { Reveal } from "@/components/motion/Reveal";
import { Glyph } from "@/components/zodiac/Glyph";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { PageHero } from "@/components/layout/PageHero";
import { Parallax } from "@/components/motion/Parallax";
import { routes } from "@/lib/routes";

export const metadata: Metadata = {
  title: "The Zodiac: Twelve Signs, Twelve Signature Perfumes",
  description: "Explore all twelve rashi and the Aaliqadr fragrance composed for each: fire, earth, air and water signs.",
  alternates: { canonical: "/zodiac" },
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
              <ul className="grid grid-cols-1 gap-4 md:grid-cols-3">
                {info.signs.map((slug, i) => {
                  const s = ZODIAC[slug];
                  return (
                    <Reveal as="li" key={slug} delay={i * 0.08}>
                      <Parallax speed={0.04 + i * 0.07}>
                        <Link
                          href={routes.sign(slug)}
                          data-zodiac={slug}
                          data-element={el}
                          className="surface group relative flex min-h-64 flex-col justify-between gap-6 overflow-clip p-7"
                        >
                          <div
                            aria-hidden
                            className="absolute inset-0 -z-10 opacity-60 transition-opacity duration-700 group-hover:opacity-100"
                            style={{ background: "radial-gradient(100% 80% at 100% 0%, var(--z-g2), transparent 65%)" }}
                          />
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="eyebrow">{s.rashi}</p>
                              <h3 className="font-display mt-2 text-4xl">{s.name}</h3>
                              <p className="text-muted mt-1 text-xs">{formatSignDates(s)}</p>
                            </div>
                            <Glyph
                              sign={slug}
                              label={false}
                              className="ease-lux text-5xl transition-transform duration-700 group-hover:rotate-12"
                            />
                          </div>
                          <div>
                            <p className="text-muted text-sm">Signature</p>
                            <p className="font-display text-2xl" style={{ color: "var(--z-primary)" }}>
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
    </div>
  );
}
