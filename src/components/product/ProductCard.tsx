import Image from "next/image";
import Link from "next/link";
import { ZODIAC } from "@/config/zodiac";
import type { ProductCardDTO } from "@/server/catalog/types";
import { BottleArt } from "@/components/zodiac/BottleArt";
import { Glyph } from "@/components/zodiac/Glyph";
import { Price } from "./Price";
import { routes } from "@/lib/routes";

/** Each card carries its own sign theme, so a grid reads as twelve small atmospheres. */
export function ProductCard({ product, priority = false }: { product: ProductCardDTO; priority?: boolean }) {
  const sign = product.zodiacSign ? ZODIAC[product.zodiacSign] : undefined;
  const image = product.media[0];
  return (
    <Link
      href={routes.product(product.slug)}
      data-zodiac={sign?.slug}
      data-element={sign?.element ?? product.element}
      className="group surface sheen relative flex h-full flex-col overflow-hidden p-0 transition-transform duration-500 ease-lux hover:-translate-y-1"
      style={{ viewTransitionName: `product-${product.slug}` }}
    >
      <div className="relative aspect-[4/5] overflow-hidden" style={{ background: "radial-gradient(80% 70% at 50% 35%, var(--z-g2), var(--z-bg) 80%)" }}>
        {image ? (
          <Image
            src={image.url}
            alt={image.alt}
            fill
            sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 50vw"
            className="object-cover transition-transform duration-700 ease-lux group-hover:scale-105"
            placeholder={image.blurDataURL ? "blur" : "empty"}
            blurDataURL={image.blurDataURL}
            preload={priority}
            loading={priority ? "eager" : "lazy"}
          />
        ) : (
          <div className="absolute inset-0 grid place-items-center p-4 transition-transform duration-700 ease-lux group-hover:scale-105 sm:p-8">
            <BottleArt sign={sign?.slug} preload={priority} className="max-h-full w-auto drop-shadow-[0_15px_30px_rgba(0,0,0,.45)]" />
          </div>
        )}
        {!product.inStock && (
          <span className="absolute left-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-[9px] uppercase tracking-widest text-ivory sm:left-3 sm:top-3 sm:px-3 sm:py-1 sm:text-[10px]">
            Sold out
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-3 sm:gap-2 sm:p-5">
        <div className="flex items-center justify-between gap-1.5">
          <span className="eyebrow truncate !text-[0.55rem] sm:!text-[0.62rem]">
            {sign ? `${sign.name} · ${sign.rashi}` : product.type === "bundle" ? "All twelve signs" : "Gift set"}
          </span>
          {sign && <Glyph sign={sign.slug} className="shrink-0 text-sm text-primary sm:text-lg" label={false} />}
        </div>
        <h3 className="font-display line-clamp-1 text-base leading-tight sm:line-clamp-none sm:text-2xl">{product.name}</h3>
        <p className="line-clamp-1 text-xs text-muted sm:line-clamp-2 sm:text-sm">{product.tagline}</p>
        <Price priceP={product.fromPriceP} mrpP={product.fromMrpP} from className="mt-auto pt-1 text-xs sm:pt-2 sm:text-base" />
      </div>
    </Link>
  );
}
