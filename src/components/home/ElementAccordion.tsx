"use client";

import Link from "next/link";
import { useState } from "react";
import { ELEMENT_INFO, ELEMENTS, type Element, type ZodiacSlug } from "@/config/zodiac";
import { Glyph } from "@/components/zodiac/Glyph";

const ELEMENT_ATMOSPHERES: Record<
  Element,
  { accent: string; description: string; notes: string[] }
> = {
  fire: {
    accent: "#C4553A", // Aries accent
    description: "Incandescent warmth, blazing saffron, smoked amber and daring pink pepper.",
    notes: ["Saffron", "Smoked Amber", "Cinnamon Bark", "Oud Wood"],
  },
  earth: {
    accent: "#8FA58A", // Virgo accent
    description: "Grounding woods, raw patchouli, tactile iris root and mountain moss.",
    notes: ["Vetiver", "Florentine Iris", "Cedarwood", "Suede Accord"],
  },
  air: {
    accent: "#7E7BD9", // Aquarius accent
    description: "Crystalline aldehydes, bergamot dawn, ethereal white tea and frankincense.",
    notes: ["Calabrian Bergamot", "Aldehydes", "White Tea", "Silver Incense"],
  },
  water: {
    accent: "#8FB8C4", // Pisces accent
    description: "Abyssal tides, dewy dark rose, driftwood and contemplative night sea.",
    notes: ["Dark Rose", "Marine Ambergris", "Driftwood", "Black Tea"],
  },
};

export function ElementAccordion() {
  const [hovered, setHovered] = useState<Element | null>(null);

  return (
    <div className="w-full">
      {/* Desktop: Expanding Flex Panels (flex-grow) | Mobile: Snap-scroll Carousel */}
      <div className="flex flex-nowrap overflow-x-auto snap-x snap-mandatory gap-3.5 pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:flex-row lg:h-[500px] lg:overflow-visible lg:pb-0">
        {ELEMENTS.map((el) => {
          const info = ELEMENT_INFO[el];
          const atmo = ELEMENT_ATMOSPHERES[el];
          const isHovered = hovered === el;

          return (
            <Link
              key={el}
              href={`/shop?element=${el}`}
              onMouseEnter={() => setHovered(el)}
              onMouseLeave={() => setHovered(null)}
              className={`group relative flex flex-col justify-between overflow-hidden border border-line bg-surface p-6 sm:p-8 transition-[flex,transform,border-color] duration-700 ease-lux shrink-0 w-[84vw] sm:w-[340px] snap-center lg:w-auto lg:shrink ${
                isHovered ? "lg:flex-[1.9] border-gold/45 shadow-[0_20px_45px_rgba(0,0,0,0.7)]" : "lg:flex-1 hover:border-gold/30"
              }`}
            >
              {/* Subtle Element Gradient Glow at low opacity */}
              <div
                aria-hidden
                className="absolute inset-0 -z-10 transition-opacity duration-700 pointer-events-none"
                style={{
                  opacity: isHovered ? 0.35 : 0.16,
                  background: `radial-gradient(100% 85% at 50% 100%, ${atmo.accent} 0%, transparent 80%)`,
                }}
              />

              {/* Top: Element Eyebrow + Glyphs */}
              <div className="flex items-center justify-between border-b border-line pb-4">
                <span className="font-caps text-[10px] uppercase tracking-[0.24em] text-gold">
                  {info.label} Element
                </span>
                <div className="flex items-center gap-2 text-muted">
                  {info.signs.map((s) => (
                    <Glyph
                      key={s}
                      sign={s as ZodiacSlug}
                      className="size-4.5 transition-transform duration-300 group-hover:scale-110"
                      label={false}
                    />
                  ))}
                </div>
              </div>

              {/* Center: Monolithic Heading & Signature Count */}
              <div className="my-auto py-6">
                <h3 className="font-display text-4xl sm:text-5xl font-light text-ivory group-hover:text-gold transition-colors duration-500">
                  {info.label}
                </h3>
                <p className="mt-2 font-caps text-[10px] uppercase tracking-[0.2em] text-muted">
                  3 Zodiac Signatures · Extrait
                </p>
              </div>

              {/* Bottom: Dynamic Content Expanded on Hover */}
              <div className="space-y-4 border-t border-line/60 pt-5">
                <p className="font-sans text-xs text-ivory/80 font-light leading-relaxed">
                  {atmo.description}
                </p>

                {/* Expanded signs and notes preview */}
                <div className="space-y-2">
                  <p className="font-caps text-[9px] uppercase tracking-[0.2em] text-gold/80">
                    Olfactive Palette:
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {atmo.notes.map((note) => (
                      <span
                        key={note}
                        className="rounded-none border border-line bg-bg/80 px-2 py-0.5 font-caps text-[9px] uppercase tracking-wider text-muted group-hover:text-ivory group-hover:border-gold/30 transition-colors"
                      >
                        {note}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="pt-2">
                  <span className="inline-flex items-center gap-2 font-caps text-[10px] uppercase tracking-[0.22em] text-gold transition-transform duration-300 group-hover:translate-x-1.5">
                    <span>Explore {info.label} Signatures</span>
                    <svg
                      className="size-3"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.25"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden
                    >
                      <path d="M5 12h14" />
                      <path d="m12 5 7 7-7 7" />
                    </svg>
                  </span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
