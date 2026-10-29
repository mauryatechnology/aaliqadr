"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Heart, Sparkles, Check } from "lucide-react";
import { ZODIAC, SIGN_ACCENTS, type ZodiacSlug } from "@/config/zodiac";
import { formatPrice } from "@/lib/money";
import { cart } from "@/lib/cart-store";
import { routes } from "@/lib/routes";
import { Reveal } from "@/components/motion/Reveal";
import type { ProductCardDTO } from "@/server/catalog/types";

interface Props {
  products: ProductCardDTO[];
}

const SIGN_DESCRIPTORS: Record<string, string> = {
  aries: "Fire · Courage · Passion",
  taurus: "Earth · Stability · Luxury",
  gemini: "Air · Intellect · Freedom",
  cancer: "Water · Intuition · Emotion",
  leo: "Fire · Confidence · Royalty",
  virgo: "Earth · Purity · Wisdom",
  libra: "Air · Harmony · Grace",
  scorpio: "Water · Intensity · Transformation",
  sagittarius: "Fire · Truth · Adventure",
  capricorn: "Earth · Discipline · Legacy",
  aquarius: "Air · Vision · Freedom",
  pisces: "Water · Dreams · Compassion",
};

const ELEMENT_TABS = [
  { id: "all", label: "ALL SIGNATURES", hindi: "सभी" },
  { id: "fire", label: "FIRE", hindi: "अग्नि" },
  { id: "earth", label: "EARTH", hindi: "पृथ्वी" },
  { id: "air", label: "AIR", hindi: "वायु" },
  { id: "water", label: "WATER", hindi: "जल" },
] as const;

type ElementTab = (typeof ELEMENT_TABS)[number]["id"];

const ELEMENT_SIGNS: Record<ElementTab, ZodiacSlug[]> = {
  all: ["aries", "taurus", "gemini", "scorpio", "leo"],
  fire: ["aries", "leo", "sagittarius"],
  earth: ["taurus", "virgo", "capricorn"],
  air: ["gemini", "libra", "aquarius"],
  water: ["cancer", "scorpio", "pisces"],
};

export function FeaturedLuxuryFragrances({ products }: Props) {
  const [activeTab, setActiveTab] = useState<ElementTab>("all");

  const targetSlugs = ELEMENT_SIGNS[activeTab];
  const filteredProducts = targetSlugs
    .map((slug) => products.find((p) => p.zodiacSign === slug))
    .filter((p): p is ProductCardDTO => Boolean(p));

  const displayProducts = filteredProducts.length > 0 ? filteredProducts : products.slice(0, 5);

  return (
    <section className="relative bg-[#07060A] text-ivory py-16 sm:py-20 lg:py-24 overflow-hidden">
      {/* Background ambient lighting */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
      >
        <div className="absolute left-1/4 top-1/2 -translate-y-1/2 h-[550px] w-[550px] rounded-full bg-[radial-gradient(circle_at_center,_rgba(201,169,110,0.06)_0%,_transparent_70%)] blur-[120px]" />
      </div>

      <div className="mx-auto max-w-[1360px] px-4 sm:px-6 lg:px-10">
        {/* Header with Title and Link */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-8">
          <Reveal>
            <div>
              <p className="font-caps text-[11px] sm:text-xs tracking-[0.24em] text-gold font-medium uppercase mb-2 flex items-center gap-2">
                <span aria-hidden className="text-gold text-[10px]">✦</span>
                <span>FEATURED COLLECTION</span>
              </p>
              <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-light text-ivory tracking-tight">
                Luxury Fragrances
              </h2>
              <p className="mt-2 text-sm sm:text-base text-muted font-normal">
                Twelve bespoke signatures with 28% Extrait de Parfum oil concentration.
              </p>
            </div>
          </Reveal>

          <Reveal delay={0.1}>
            <Link
              href="/shop"
              className="group inline-flex items-center gap-2 font-caps text-xs uppercase tracking-[0.2em] text-[#E0C892] hover:text-gold transition-colors"
            >
              <span>Shop All Fragrances</span>
              <ArrowRight className="size-3.5 transition-transform duration-300 group-hover:translate-x-1" />
            </Link>
          </Reveal>
        </div>

        {/* ── Category / Element Filter Tabs (zodiacperfumes.com inspired) ── */}
        <Reveal delay={0.15}>
          <div className="mt-8 flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none -mx-4 px-4 sm:mx-0 sm:px-0">
            {ELEMENT_TABS.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`group relative flex items-center gap-2 rounded-full min-h-[44px] px-6 py-2.5 font-caps text-xs uppercase tracking-[0.18em] transition-all duration-200 shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 active:scale-98 ${
                    isActive
                      ? "bg-gold text-[#0B090F] font-semibold shadow-[0_0_20px_rgba(201,169,110,0.4)]"
                      : "border border-white/10 bg-surface/50 text-ivory/80 hover:border-gold/40 hover:text-gold"
                  }`}
                >
                  <span>{tab.label}</span>
                  <span className={`text-[10px] opacity-70 ${isActive ? "text-[#0B090F]" : "text-gold/70"}`}>
                    ({tab.hindi})
                  </span>
                </button>
              );
            })}
          </div>
        </Reveal>

        {/* Cards Grid / Showcase with Micro-interactions */}
        <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-5">
          {displayProducts.map((p, index) => (
            <Reveal key={`${p.id}-${activeTab}`} delay={index * 0.06}>
              <LuxuryFragranceCard product={p} index={index} />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function LuxuryFragranceCard({ product, index }: { product: ProductCardDTO; index: number }) {
  const [wished, setWished] = useState(false);
  const [added, setAdded] = useState(false);
  const signSlug = product.zodiacSign ?? "aries";
  const signInfo = ZODIAC[signSlug];
  const accent = SIGN_ACCENTS[signSlug] ?? "#C9A96E";
  const descriptor = SIGN_DESCRIPTORS[signSlug] ?? "Extrait de Parfum · 28%";
  const isBestseller = index === 0;

  const defaultVariant = product.quickVariants[0];
  const priceP = defaultVariant?.priceP ?? product.fromPriceP;

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (product.defaultSku) {
      cart.add({ sku: product.defaultSku, slug: product.slug }, 1);
      setAdded(true);
      setTimeout(() => setAdded(false), 2200);
    }
  };

  return (
    <div className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-white/10 bg-[#0E0C12] p-5 transition-all duration-500 ease-out hover:-translate-y-2 hover:border-gold/50 hover:shadow-[0_20px_48px_rgba(0,0,0,0.85)] hover:bg-[#120F17]">
      {/* Subtle top-card ambient radiance */}
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-px rounded-2xl bg-gradient-to-b from-gold/10 via-transparent to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100"
      />

      {/* Top Bar: Restrained Luxury Badge & Wishlist */}
      <div className="relative z-10 flex items-center justify-between pb-2">
        {isBestseller ? (
          <span className="rounded-full bg-gold/15 border border-gold/40 px-3 py-1 font-caps text-xs uppercase tracking-[0.16em] text-gold font-medium shadow-[0_0_12px_rgba(201,169,110,0.2)]">
            Maison Signature
          </span>
        ) : (
          <span className="font-caps text-xs uppercase tracking-[0.16em] text-gold font-medium">
            {signInfo ? `${signInfo.name} · ${signInfo.rashi}` : "✦"}
          </span>
        )}

        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setWished(!wished);
          }}
          aria-label={`Save ${product.name} to wishlist`}
          className="grid size-11 min-h-[44px] min-w-[44px] place-items-center rounded-full text-muted transition-all duration-200 hover:text-gold hover:bg-white/10 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 cursor-pointer"
        >
          <Heart
            className={`size-4 transition-transform ${
              wished ? "fill-gold text-gold" : ""
            }`}
          />
        </button>
      </div>

      {/* Center Flacon Visual with Element Glow & 3D Lift VFX */}
      <Link href={routes.product(product.slug)} className="relative my-3 flex flex-col items-center">
        <div className="relative aspect-[3/4] w-full max-w-[190px] overflow-hidden flex items-center justify-center">
          {/* Ambient Elemental Aura Glow */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-full blur-[45px] opacity-35 transition-all duration-700 group-hover:opacity-75 group-hover:scale-110"
            style={{
              background: `radial-gradient(circle at center, ${accent} 0%, transparent 70%)`,
            }}
          />

          {/* Bottle Art / Image with smooth 3D float scaling */}
          <div className="relative z-10 size-full p-2 transition-transform duration-500 ease-out group-hover:scale-108 group-hover:-translate-y-1">
            <Image
              src={`/bottles/${signSlug}.svg`}
              alt={product.name}
              fill
              sizes="(min-width: 1024px) 20vw, 40vw"
              className="object-contain drop-shadow-[0_16px_28px_rgba(0,0,0,0.9)]"
            />
          </div>
        </div>

        {/* Product Details */}
        <div className="mt-4 text-center">
          <h3 className="font-display text-xl sm:text-2xl font-light tracking-wide text-ivory group-hover:text-gold transition-colors duration-300">
            {signInfo ? signInfo.name : product.name}
          </h3>
          <p className="mt-1 text-sm text-ivory/85 font-normal leading-snug">
            {descriptor}
          </p>
          <div className="mt-2.5 flex items-baseline justify-center gap-2">
            <span className="font-display text-lg font-medium text-ivory tracking-wide">
              {formatPrice(priceP)}
            </span>
            <span className="text-xs font-caps uppercase tracking-wider text-muted">
              50ml Extrait
            </span>
          </div>
        </div>
      </Link>

      {/* Direct Add to Cart Button with Animated Success Feedback */}
      <div className="mt-4 pt-2">
        <button
          type="button"
          onClick={handleAddToCart}
          className={`w-full min-h-[44px] rounded-full py-3 font-caps text-xs uppercase tracking-[0.2em] font-semibold transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 ${
            added
              ? "bg-[#2563EB] text-white shadow-[0_0_20px_rgba(37,99,235,0.4)]"
              : "bg-[#E3C79B] text-[#16120D] hover:bg-[#F2DCBA] hover:shadow-[0_0_24px_rgba(227,199,155,0.45)] hover:-translate-y-0.5 active:translate-y-0 active:scale-98"
          }`}
        >
          {added ? (
            <>
              <Check className="size-4 stroke-[2.5]" />
              <span>Added to Bag</span>
            </>
          ) : (
            <>
              <Sparkles className="size-3 text-[#16120D]/60" />
              <span>Add to Bag</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
