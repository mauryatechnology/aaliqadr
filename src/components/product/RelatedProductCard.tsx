import Image from "next/image";
import Link from "next/link";
import { Star } from "lucide-react";
import { ZODIAC } from "@/config/zodiac";
import { BADGES, type ProductCardDTO } from "@/server/catalog/types";
import { BottleArt } from "@/components/zodiac/BottleArt";
import { Glyph } from "@/components/zodiac/Glyph";
import { Price } from "./Price";
import { routes } from "@/lib/routes";
import { WishlistButton } from "./WishlistButton";

/**
 * Clean recommendation card for related & ritual products on the PDP.
 * Pure server component without quick-add or card swatches to respect the 170 KB first-load JS budget.
 */
export function RelatedProductCard({ product, priority = false }: { product: ProductCardDTO; priority?: boolean }) {
  const sign = product.zodiacSign ? ZODIAC[product.zodiacSign] : undefined;
  const image = product.media[0];
  const second = product.media[1];
  const left = product.quickVariants.reduce((n, v) => n + v.stock, 0);

  return (
    <article
      data-zodiac={sign?.slug}
      data-element={sign?.element ?? product.element}
      className="group relative flex h-full flex-col overflow-hidden rounded-none border border-line bg-surface transition-all duration-500 ease-lux hover:-translate-y-1 hover:border-gold/40 hover:shadow-[0_20px_40px_rgba(0,0,0,0.6)]"
      style={{ viewTransitionName: `product-${product.slug}` }}
    >
      <Link href={routes.product(product.slug)} className="flex h-full flex-col focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold">
        <div className="relative aspect-[4/5] overflow-hidden bg-surface" style={{ background: "radial-gradient(circle at 50% 50%, color-mix(in srgb, var(--z-primary, #C9A96E) 18%, transparent) 0%, transparent 72%)" }}>
          {image ? (
            <Image
              src={image.url}
              alt={image.alt}
              fill
              sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 50vw"
              className={image.url.endsWith(".svg") ? "object-contain p-4 drop-shadow-[0_15px_30px_rgba(0,0,0,.45)] transition-transform duration-700 ease-lux group-hover:scale-105" : "object-cover transition-transform duration-700 ease-lux group-hover:scale-105"}
              placeholder={image.blurDataURL && !image.url.endsWith(".svg") ? "blur" : "empty"}
              blurDataURL={image.blurDataURL}
              unoptimized={image.url.endsWith(".svg")}
              preload={priority}
              loading={priority ? "eager" : "lazy"}
            />
          ) : (
            <div className="absolute inset-0 grid place-items-center p-4 transition-transform duration-700 ease-lux group-hover:scale-105 sm:p-8">
              <BottleArt sign={sign?.slug} preload={priority} className="max-h-full w-auto drop-shadow-[0_15px_30px_rgba(0,0,0,.45)]" />
            </div>
          )}
          {image && second && (
            <Image src={second.url} alt="" fill sizes="(min-width: 1024px) 25vw, 50vw" unoptimized={second.url.endsWith(".svg")} className={second.url.endsWith(".svg") ? "object-contain p-4 opacity-0 transition-opacity duration-700 ease-lux [@media(hover:hover)]:group-hover:opacity-100" : "object-cover opacity-0 transition-opacity duration-700 ease-lux [@media(hover:hover)]:group-hover:opacity-100"} />
          )}
          {product.inStock && product.badges[0] && (
            <span className="absolute left-2.5 top-2.5 border border-gold/30 bg-bg/90 px-2 py-0.5 font-caps text-[9px] uppercase tracking-[0.2em] text-gold backdrop-blur-sm">
              {BADGES[product.badges[0]]}
            </span>
          )}
          {!product.inStock && (
            <span className="absolute left-2.5 top-2.5 border border-line bg-bg/90 px-2 py-0.5 font-caps text-[9px] uppercase tracking-[0.2em] text-muted backdrop-blur-sm">
              Archived
            </span>
          )}
        </div>

        <div className="flex flex-1 flex-col gap-1.5 p-3 sm:gap-2 sm:p-5">
          <div className="flex items-center justify-between gap-1.5">
            <span className="eyebrow truncate !text-[0.55rem] font-medium tracking-[0.18em] text-gold-light/95 sm:!text-[0.62rem]">
              {sign ? `${sign.name} · ${sign.rashi}` : product.type === "bundle" ? "All twelve signs" : product.type === "gift_set" ? "Gift set" : product.optionCount > 1 ? `${product.optionCount} options` : "Aaliqadr"}
            </span>
            {sign && <Glyph sign={sign.slug} className="shrink-0 text-sm text-primary drop-shadow-[0_0_8px_var(--z-glow)] sm:text-lg" label={false} />}
          </div>
          <h3 className="font-display line-clamp-1 text-base leading-tight text-ivory transition-colors group-hover:text-gold-light sm:line-clamp-none sm:text-2xl">{product.name}</h3>
          <p className="line-clamp-1 text-xs text-ivory/75 font-normal sm:line-clamp-2 sm:text-sm">{product.tagline}</p>
          
          {product.ratingCount > 0 && (
            <div className="flex items-center gap-1 text-[11px] text-ivory/70 pt-0.5">
              <Star className="size-3 text-gold fill-current" />
              <span className="font-semibold text-ivory">{product.ratingAvg.toFixed(1)}</span>
              <span>({product.ratingCount})</span>
            </div>
          )}

          <Price priceP={product.fromPriceP} mrpP={product.fromMrpP} from className="mt-auto pt-1 text-xs sm:pt-2 sm:text-base font-semibold" />
          {product.inStock && left > 0 && left <= 3 && <span className="font-caps text-[10px] uppercase tracking-wider text-gold/80">Only {left} left</span>}
        </div>
      </Link>
      <div className="absolute right-2.5 top-2.5 z-20 flex flex-col gap-1.5">
        <WishlistButton slug={product.slug} name={product.name} />
      </div>
    </article>
  );
}
