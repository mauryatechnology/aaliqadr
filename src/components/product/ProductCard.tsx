import Image from "next/image";
import Link from "next/link";
import { ZODIAC, SIGN_ACCENTS, type ZodiacSlug } from "@/config/zodiac";
import type { ProductCardDTO } from "@/server/catalog/types";
import { BottleArt } from "@/components/zodiac/BottleArt";
import { ZodiacGoldGlyph } from "@/components/zodiac/ZodiacGoldGlyph";
import { formatPrice } from "@/lib/money";
import { routes } from "@/lib/routes";
import { QuickAdd } from "./QuickAdd";
import { WishlistButton } from "./WishlistButton";
import { QuickViewButton } from "./QuickView";
import { SharedBottle, SharedGlow } from "./SharedBottle";

const RASHI_DEVANAGARI: Record<string, string> = {
  aries: "मेष",
  taurus: "वृषभ",
  gemini: "मिथुन",
  cancer: "कर्क",
  leo: "सिंह",
  virgo: "कन्या",
  libra: "तुला",
  scorpio: "वृश्चिक",
  sagittarius: "धनु",
  capricorn: "मकर",
  aquarius: "कुम्भ",
  pisces: "मीन",
};

/**
 * Luxury Niche Product Card
 * - --surface background (#14121A)
 * - Bottle centered with sign-accent glow at 15-25% opacity
 * - 1px sign-accent hairline under the product name
 * - Devanagari rashi name in --muted (#A8A3B3)
 * - Single price in ivory (#F4EFE6)
 * - Hover lifts 4px and brightens the 1px hairline border from --line to gold
 * - Max one tiny gold text badge
 */
export function ProductCard({
  product,
  priority = false,
}: {
  product: ProductCardDTO;
  priority?: boolean;
}) {
  const sign = product.zodiacSign ? ZODIAC[product.zodiacSign] : undefined;
  const image = product.media[0];
  const devanagariRashi = product.zodiacSign ? RASHI_DEVANAGARI[product.zodiacSign] : undefined;

  // Per-sign accent color strictly per specification
  const signAccent = product.zodiacSign ? SIGN_ACCENTS[product.zodiacSign] : "#C9A96E";

  return (
    <article
      data-zodiac={sign?.slug}
      data-element={sign?.element ?? product.element}
      className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-line/80 bg-surface shadow-[0_8px_24px_rgba(0,0,0,0.4)] transition-all duration-500 ease-lux hover:-translate-y-1 hover:border-gold/40 hover:shadow-[0_20px_44px_rgba(0,0,0,0.65)]"
      style={{
        ["--sign-accent" as string]: signAccent,
        viewTransitionName: `product-${product.slug}`,
      }}
    >
      <Link
        href={routes.product(product.slug)}
        className="flex h-full flex-col focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
      >
        {/* 4:5 Visual Area: Centered bottle with sign-accent radial glow */}
        <div className="relative aspect-[4/5] w-full overflow-hidden bg-surface rounded-t-2xl">
          {/* Shared sign-accent glow: blooms softly on hover */}
          <SharedGlow
            slug={product.slug}
            signAccent={signAccent}
            className="pointer-events-none absolute inset-0 transition-all duration-700 ease-lux opacity-20 group-hover:opacity-45 group-hover:scale-110"
          />

          {/* Shared bottle container: smooth dignified float and scale without awkward tilt */}
          <SharedBottle
            slug={product.slug}
            signAccent={signAccent}
            className="size-full flex items-center justify-center"
          >
            {image ? (
              <div className="relative size-full p-4 sm:p-5 flex items-center justify-center transition-all duration-700 ease-lux group-hover:-translate-y-2 group-hover:scale-[1.03]">
                <Image
                  src={image.url}
                  alt={image.alt}
                  fill
                  sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 50vw"
                  className={
                    image.url.endsWith(".svg")
                      ? "object-contain p-2 drop-shadow-[0_20px_35px_rgba(0,0,0,0.7)] transition-all duration-700 ease-lux group-hover:drop-shadow-[0_28px_45px_rgba(0,0,0,0.85)]"
                      : "object-cover"
                  }
                  placeholder={image.blurDataURL && !image.url.endsWith(".svg") ? "blur" : "empty"}
                  blurDataURL={image.blurDataURL}
                  unoptimized={image.url.endsWith(".svg")}
                  preload={priority}
                  loading={priority ? "eager" : "lazy"}
                />
              </div>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center p-4 sm:p-5 transition-all duration-700 ease-lux group-hover:-translate-y-2 group-hover:scale-[1.03]">
                <div
                  className="relative max-h-full w-auto transition-all duration-700 ease-lux"
                  style={{
                    filter: `drop-shadow(0 15px 30px rgba(0,0,0,0.8)) drop-shadow(0 0 25px color-mix(in srgb, ${signAccent} 25%, transparent))`,
                  }}
                >
                  <BottleArt sign={sign?.slug} preload={priority} className="max-h-60 sm:max-h-68 w-auto" />
                </div>
              </div>
            )}
          </SharedBottle>

          {/* Subtle luxury glass light reflection sweep across flacon on hover */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 z-20 -translate-x-full bg-gradient-to-r from-transparent via-white/[0.10] to-transparent transition-transform duration-1000 ease-lux group-hover:translate-x-full"
          />

          {/* Max one tiny gold text badge (no red/green discount badges) */}
          <div className="absolute left-3 top-3 z-10">
            {product.inStock ? (
              <span className="inline-block rounded-full border border-gold/40 bg-bg/95 px-3 py-1 font-caps text-[11px] uppercase tracking-[0.14em] text-gold font-medium backdrop-blur-sm shadow-sm">
                {product.badges[0] ? product.badges[0].replace("_", " ") : "Extrait · 28%"}
              </span>
            ) : (
              <span className="inline-block rounded-full border border-line bg-bg/95 px-3 py-1 font-caps text-[11px] uppercase tracking-[0.14em] text-muted backdrop-blur-sm">
                Archived
              </span>
            )}
          </div>

          {/* Luxury Embossed Gold Rashi Medallion (top right) */}
          {sign && (
            <div
              className="absolute right-3 top-3 z-10 grid size-8 sm:size-9 place-items-center rounded-full border border-gold/35 bg-bg/90 backdrop-blur-md shadow-[0_4px_12px_rgba(0,0,0,0.5)] transition-all duration-300 group-hover:scale-110 group-hover:border-gold group-hover:shadow-[0_0_15px_rgba(201,169,110,0.35)]"
              title={`${sign.name} (${devanagariRashi} राशि)`}
            >
              <ZodiacGoldGlyph sign={sign.slug as ZodiacSlug} className="size-4.5 sm:size-5" />
            </div>
          )}
        </div>

        {/* Card Body: English Name + 1px sign hairline + Devanagari Rashi + Single Clear Price */}
        <div className="flex flex-1 flex-col justify-between p-4.5 sm:p-5.5">
          <div className="space-y-1.5">
            {/* English Fragrance Name in Ivory */}
            <h3 className="font-display text-xl sm:text-2xl font-light leading-snug text-ivory transition-colors group-hover:text-gold">
              {product.name}
            </h3>

            {/* 1px hairline under the product name turning gold on hover */}
            <div
              className="h-[1px] w-8 my-2 transition-all duration-500 ease-lux group-hover:w-16 group-hover:!bg-gold group-hover:opacity-100"
              style={{ backgroundColor: signAccent, opacity: 0.8 }}
              aria-hidden
            />

            {/* Devanagari Rashi Name & Sign beneath with high contrast */}
            {sign && (
              <p className="flex items-center gap-2 pt-0.5 text-ivory/90">
                <span className="font-rashi text-base sm:text-lg tracking-wide text-ivory font-medium">
                  {devanagariRashi} राशि
                </span>
                <span className="text-xs text-gold/90 font-medium">
                  · {sign.name} ({sign.element.charAt(0).toUpperCase() + sign.element.slice(1)})
                </span>
              </p>
            )}

            {/* One-line fragrance note/tagline */}
            <p className="line-clamp-1 pt-1 text-xs sm:text-sm font-normal text-ivory/85 leading-relaxed">
              {product.tagline}
            </p>
          </div>

          {/* Single clear price in ivory */}
          <div className="mt-4 pt-3.5 border-t border-line/80 flex items-baseline justify-between">
            <span className="font-display text-xl sm:text-2xl text-ivory font-normal">
              {formatPrice(product.fromPriceP)}
            </span>
            <span className="font-caps text-[11px] sm:text-xs uppercase tracking-[0.16em] text-muted">
              50ml Extrait
            </span>
          </div>
        </div>
      </Link>

      {/* Discreet Secondary Action Icons */}
      <div className="absolute right-2.5 top-14 z-20 flex flex-col gap-1.5 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
        <WishlistButton slug={product.slug} name={product.name} />
        <QuickViewButton slug={product.slug} name={product.name} />
      </div>

      <QuickAdd product={product} />
    </article>
  );
}
