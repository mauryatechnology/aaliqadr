import type { Metadata } from "next";
import Image from "next/image";
import { ELEMENT_INFO, ELEMENTS } from "@/config/zodiac";
import { site } from "@/config/site";
import { Reveal } from "@/components/motion/Reveal";
import { Parallax } from "@/components/motion/Parallax";
import { Depth, PointerDepth } from "@/components/motion/PointerDepth";
import { ButtonLink } from "@/components/ui/ButtonLink";

export const metadata: Metadata = {
  title: "Our Craft: The House of Aaliqadr",
  description: "How Aaliqadr composes twelve Extrait de Parfum signatures, one for every sign of the zodiac.",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <div className="relative overflow-clip">
      <Parallax speed={-0.45} className="absolute inset-x-0 -inset-y-24 -z-10">
        <div aria-hidden className="aurora" />
      </Parallax>
      <PointerDepth className="mx-auto grid max-w-[1200px] grid-cols-1 items-center gap-12 px-4 py-20 sm:px-6 md:grid-cols-2">
        <Reveal>
          <Parallax speed={-0.15} className="flex flex-col gap-6">
            <p className="eyebrow">Our craft</p>
            <h1 className="font-display text-5xl leading-none sm:text-6xl">High esteem, in a single drop</h1>
            <p className="text-muted leading-relaxed">
              {site.name} begins with a monogram: the letters alif and qaf, drawn together into the shape of a perfume drop that is also a
              flame. It is a promise of what we make: concentrated, considered, and personal.
            </p>
            <p className="text-muted leading-relaxed">
              Each of our twelve signatures starts with an element. Fire signs get spice and amber, earth signs woods and resins, air signs
              citrus and airy florals, water signs aquatic accords and deep musks. The ruling planet and temperament of each sign then shape
              the heart of the composition.
            </p>
          </Parallax>
        </Reveal>
        <Reveal delay={0.1} className="mx-auto w-full max-w-md">
          <Parallax speed={0.3}>
            <Depth strength={18} className="relative aspect-square w-full">
              <Image
                src="/brand/logo-embossed-gold.png"
                alt="The Aaliqadr monogram embossed in gold foil"
                fill
                quality={85}
                preload
                loading="eager"
                sizes="(min-width: 768px) 45vw, 90vw"
                className="object-contain drop-shadow-[0_40px_60px_rgba(0,0,0,.55)]"
              />
            </Depth>
          </Parallax>
        </Reveal>
      </PointerDepth>
      <section className="mx-auto max-w-[1200px] px-4 pb-24 sm:px-6">
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {ELEMENTS.map((el, i) => (
            <Reveal as="li" key={el} delay={i * 0.08}>
              <Parallax speed={0.04 + i * 0.06} className="surface flex flex-col gap-2 p-6">
                <h2 className="font-display text-3xl">{ELEMENT_INFO[el].label}</h2>
                <p className="text-muted text-sm">{ELEMENT_INFO[el].scent}</p>
              </Parallax>
            </Reveal>
          ))}
        </ul>
        <div className="mt-12 flex justify-center">
          <ButtonLink href="/zodiac">Meet the twelve</ButtonLink>
        </div>
      </section>
    </div>
  );
}
