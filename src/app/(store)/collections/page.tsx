import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { routes } from "@/lib/routes";
import { getCategories, getCollectionCards, getCollections } from "@/server/queries/catalog";
import { PageHero } from "@/components/layout/PageHero";
import { BottleArt } from "@/components/zodiac/BottleArt";
import { Reveal } from "@/components/motion/Reveal";

export const metadata: Metadata = {
  title: "Collections",
  description: "Curated Aaliqadr edits: fragrances by element, gifting sets and bestsellers.",
  alternates: { canonical: "/collections" },
};

export default async function CollectionsIndex() {
  const [collections, categories] = await Promise.all([getCollections(), getCategories()]);
  const withCounts = await Promise.all(collections.toSorted((a, b) => Number(b.featured) - Number(a.featured)).map(async (c) => ({ c, cards: (await getCollectionCards(c.slug))?.cards ?? [] })));
  const roots = categories.filter((c) => !c.parentId);
  return (
    <>
      <PageHero eyebrow="Curated" title="Collections">
        <p className="text-muted max-w-xl text-lg">Edits across the whole house: by element, for gifting, and the signs our customers love most.</p>
      </PageHero>
      <div className="mx-auto flex max-w-[1360px] flex-col gap-16 px-4 pb-24 sm:px-6">
        <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {withCounts.filter((x) => x.cards.length).map(({ c, cards }) => (
            <li key={c.id}>
              <Reveal>
                <Link href={routes.collection(c.slug)} data-zodiac={cards[0]?.zodiacSign} className="group surface sheen relative flex aspect-[4/5] flex-col justify-end overflow-clip p-6">
                  <span className="absolute inset-0 -z-10" style={{ background: "radial-gradient(80% 70% at 50% 30%, var(--z-g2), var(--z-bg) 85%)" }} />
                  {c.image ? (
                    <Image src={c.image.url} alt={c.image.alt || c.name} fill sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw" className="-z-10 object-cover opacity-80 transition-transform duration-700 group-hover:scale-105" />
                  ) : (
                    <span className="absolute inset-x-0 top-8 mx-auto w-2/5 transition-transform duration-700 group-hover:-translate-y-2"><BottleArt sign={cards[0]?.zodiacSign} /></span>
                  )}
                  <span className="relative flex flex-col gap-2">
                    <span className="eyebrow">{cards.length} {cards.length === 1 ? "piece" : "pieces"}</span>
                    <span className="font-display text-3xl">{c.name}</span>
                    <span className="text-muted line-clamp-2 text-sm">{c.description}</span>
                    <span className="mt-2 inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-accent">Explore <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-1" /></span>
                  </span>
                </Link>
              </Reveal>
            </li>
          ))}
        </ul>
        {roots.length > 0 && (
          <section>
            <h2 className="eyebrow mb-5">Shop by category</h2>
            <div className="flex flex-wrap gap-2">
              {categories.map((c) => (
                <Link key={c.id} href={routes.category(c.slug)} className="rounded-full border border-white/15 px-4 py-2 text-xs uppercase tracking-[0.18em] text-fg/80 hover:border-gold/60">{c.name}</Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </>
  );
}
