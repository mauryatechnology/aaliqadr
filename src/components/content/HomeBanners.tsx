import Image from "next/image";
import Link from "next/link";
import type { Route } from "next";
import { ArrowRight } from "lucide-react";
import { getContent } from "@/server/queries/engagement";
import { Reveal } from "@/components/motion/Reveal";

/** Promotional tiles from Admin › Content › Home banners. */
export async function HomeBanners() {
  const banners = (await getContent()).banners.filter((b) => b.active && b.title);
  if (!banners.length) return null;
  return (
    <section aria-label="Featured" className="mx-auto max-w-[1360px] px-4 py-16 sm:px-6">
      <ul className={banners.length === 1 ? "grid grid-cols-1" : "grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3"}>
        {banners.map((b) => {
          const inner = (
            <>
              {b.image && <Image src={b.image.url} alt={b.image.alt || b.title} fill sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw" className="-z-10 object-cover transition-transform duration-700 group-hover:scale-105" />}
              <span aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
              <span className="flex flex-col gap-2">
                <span className="font-display text-3xl leading-tight sm:text-4xl">{b.title}</span>
                {b.subtitle && <span className="text-sm text-ivory/80">{b.subtitle}</span>}
                {b.cta && <span className="mt-2 inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-gold-light">{b.cta} <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-1" /></span>}
              </span>
            </>
          );
          const cls = "group surface relative isolate flex aspect-[4/5] flex-col justify-end overflow-clip p-6 sm:aspect-[5/4] lg:aspect-[4/5]";
          return (
            <li key={b.id}>
              <Reveal>
                {b.href ? (b.href.startsWith("/") ? <Link href={b.href as Route} className={cls}>{inner}</Link> : <a href={b.href} className={cls} rel="noreferrer">{inner}</a>) : <div className={cls}>{inner}</div>}
              </Reveal>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
