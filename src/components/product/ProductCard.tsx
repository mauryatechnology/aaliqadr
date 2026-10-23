"use client";

import Image from "next/image";
import Link from "next/link";
import { ShoppingBag, Star } from "lucide-react";
import { ZODIAC } from "@/config/zodiac";
import { BADGES, type ProductCardDTO } from "@/server/catalog/types";
import { BottleArt } from "@/components/zodiac/BottleArt";
import { Glyph } from "@/components/zodiac/Glyph";
import { Price } from "./Price";
import { routes } from "@/lib/routes";
import { cart } from "@/lib/cart-store";

/** Each card carries its own sign theme, so a grid reads as twelve small atmospheres. */
export function ProductCard({ product, priority = false }: { product: ProductCardDTO; priority?: boolean }) {
  const sign = product.zodiacSign ? ZODIAC[product.zodiacSign] : undefined;
  const image = product.media[0];
  const second = product.media[1];

  function onQuickAdd(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!product.inStock || !product.defaultSku) return;
    cart.add({ sku: product.defaultSku, slug: product.slug }, 1);
  }

  return (
    <Link
      href={routes.product(product.slug)}
      data-zodiac={sign?.slug}
      data-element={sign?.element ?? product.element}
      className="group surface sheen relative flex h-full flex-col overflow-hidden p-0 transition-transform duration-500 ease-lux hover:-translate-y-1 shadow-md hover:shadow-xl"
      style={{ viewTransitionName: `product-${product.slug}` }}
    >
      <div className="relative aspect-[4/5] overflow-hidden" style={{ background: "radial-gradient(80% 70% at 50% 35%, var(--z-g2), var(--z-bg) 80%)" }}>
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
        {/* Second photo crossfades in on hover (pointer devices only). */}
        {image && second && (
          <Image src={second.url} alt="" fill sizes="(min-width: 1024px) 25vw, 50vw" unoptimized={second.url.endsWith(".svg")} className={second.url.endsWith(".svg") ? "object-contain p-4 opacity-0 transition-opacity duration-700 ease-lux [@media(hover:hover)]:group-hover:opacity-100" : "object-cover opacity-0 transition-opacity duration-700 ease-lux [@media(hover:hover)]:group-hover:opacity-100"} />
        )}
        {product.inStock && product.badges[0] && (
          <span className="absolute left-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-[9px] uppercase tracking-widest text-ivory backdrop-blur sm:left-3 sm:top-3 sm:px-3 sm:py-1 sm:text-[10px]">
            {BADGES[product.badges[0]]}
          </span>
        )}
        {!product.inStock && (
          <span className="absolute left-2 top-2 rounded-full bg-black/75 px-2 py-0.5 text-[9px] uppercase tracking-widest text-red-300 sm:left-3 sm:top-3 sm:px-3 sm:py-1 sm:text-[10px]">
            Sold out
          </span>
        )}

        {/* 1-Click Quick Add Button */}
        {product.inStock && product.defaultSku && (
          <button
            type="button"
            onClick={onQuickAdd}
            aria-label={`Quick add ${product.name} to bag`}
            className="absolute bottom-2.5 right-2.5 z-10 grid size-8 place-items-center rounded-full bg-gold text-obsidian shadow-lg transition-all duration-300 hover:scale-115 hover:bg-gold-light active:scale-95 sm:size-9 sm:opacity-0 sm:group-hover:opacity-100"
            title="Quick Add to Bag"
          >
            <ShoppingBag className="size-4" strokeWidth={2} />
          </button>
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
        
        {/* Rating and Reviews (Social Proof) */}
        {product.ratingCount > 0 && (
          <div className="flex items-center gap-1 text-[11px] text-ivory/70 pt-0.5">
            <Star className="size-3 text-gold fill-current" />
            <span className="font-semibold text-ivory">{product.ratingAvg.toFixed(1)}</span>
            <span>({product.ratingCount})</span>
          </div>
        )}

        <Price priceP={product.fromPriceP} mrpP={product.fromMrpP} from className="mt-auto pt-1 text-xs sm:pt-2 sm:text-base font-semibold" />
      </div>
    </Link>
  );
}
