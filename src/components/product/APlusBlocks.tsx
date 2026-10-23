import Image from "next/image";
import { Sparkle } from "lucide-react";
import type { APlusBlock } from "@/server/catalog/types";
import { Reveal } from "@/components/motion/Reveal";
import { cn } from "@/lib/cn";

/** The product's "A+" story blocks, in the order the admin arranged them. */
export function APlusBlocks({ blocks }: { blocks: APlusBlock[] }) {
  if (!blocks.length) return null;
  return (
    <section aria-label="More about this product" className="mx-auto flex max-w-[1360px] flex-col gap-16 px-4 py-16 sm:px-6 lg:gap-24 lg:py-24">
      {blocks.map((b) => (
        <Reveal key={b.id}>
          {b.type === "text" && (
            <div className="mx-auto max-w-3xl text-center">
              {b.title && <h2 className="font-display text-4xl sm:text-5xl">{b.title}</h2>}
              {b.body && <p className="text-muted mt-5 text-lg leading-relaxed whitespace-pre-line">{b.body}</p>}
            </div>
          )}
          {b.type === "image" && b.image && (
            <figure className="flex flex-col gap-4">
              <div className="surface relative aspect-[16/8] overflow-clip">
                <Image src={b.image.url} alt={b.image.alt || b.title || ""} fill sizes="(min-width: 1360px) 1360px, 100vw" className="object-cover" />
              </div>
              {b.title && <figcaption className="font-display text-center text-2xl">{b.title}</figcaption>}
            </figure>
          )}
          {b.type === "image_text" && (
            <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-2 lg:gap-16">
              {b.image && (
                <div className={cn("surface relative aspect-square overflow-clip", b.imageSide === "right" && "lg:order-2")}>
                  <Image src={b.image.url} alt={b.image.alt || b.title || ""} fill sizes="(min-width: 1024px) 50vw, 100vw" className="object-cover" />
                </div>
              )}
              <div className="flex flex-col gap-4">
                {b.title && <h2 className="font-display text-4xl leading-tight sm:text-5xl">{b.title}</h2>}
                {b.body && <p className="text-muted text-lg leading-relaxed whitespace-pre-line">{b.body}</p>}
              </div>
            </div>
          )}
          {b.type === "features" && (
            <div className="flex flex-col gap-8">
              {b.title && <h2 className="font-display text-center text-4xl sm:text-5xl">{b.title}</h2>}
              <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {(b.features ?? []).map((f) => (
                  <li key={f} className="surface flex items-start gap-3 p-5">
                    <Sparkle className="text-accent mt-0.5 size-4 shrink-0" aria-hidden />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Reveal>
      ))}
    </section>
  );
}
