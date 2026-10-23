import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { BadgeCheck, Star } from "lucide-react";
import { getSessionUser } from "@/server/auth";
import { getProductReviews } from "@/server/queries/engagement";
import { hasBought } from "@/server/services/reviews";
import { routes } from "@/lib/routes";
import { Reveal } from "@/components/motion/Reveal";
import { ReviewForm } from "./ReviewForm";

const date = new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeZone: "Asia/Kolkata" });

function Stars({ value, size = "size-4" }: { value: number; size?: string }) {
  return (
    <span className="flex" aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => <Star key={n} className={size} style={{ color: "var(--z-primary)" }} fill={n <= Math.round(value) ? "currentColor" : "none"} aria-hidden />)}
    </span>
  );
}

/** Approved reviews (cached) plus the write-a-review form (per visitor, streamed in). */
export async function ProductReviews({ productId, slug, ratingAvg, ratingCount }: { productId: string; slug: string; ratingAvg: number; ratingCount: number }) {
  const { reviews, distribution } = await getProductReviews(productId);
  const total = distribution.reduce((a, b) => a + b, 0);
  return (
    <section id="reviews" aria-labelledby="reviews-title" className="mx-auto max-w-[1360px] scroll-mt-24 px-4 py-16 sm:px-6">
      <Reveal className="mb-10 flex flex-col gap-3">
        <p className="eyebrow">In their words</p>
        <h2 id="reviews-title" className="font-display text-4xl">Reviews</h2>
      </Reveal>
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[320px_minmax(0,1fr)]">
        <div className="flex flex-col gap-5">
          {ratingCount > 0 ? (
            <div className="flex items-end gap-3">
              <span className="font-display text-6xl leading-none">{ratingAvg.toFixed(1)}</span>
              <span className="flex flex-col gap-1 pb-1"><Stars value={ratingAvg} /><span className="text-muted text-xs">{ratingCount} review{ratingCount === 1 ? "" : "s"}</span></span>
            </div>
          ) : (
            <p className="text-muted text-sm">No reviews yet. Be the first to share how it wears.</p>
          )}
          {total > 0 && (
            <ul className="flex flex-col gap-1.5 text-xs">
              {[5, 4, 3, 2, 1].map((n) => (
                <li key={n} className="flex items-center gap-2">
                  <span className="w-3 text-muted">{n}</span>
                  <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10"><span className="block h-full rounded-full" style={{ width: `${(distribution[n - 1]! / total) * 100}%`, background: "var(--z-primary)" }} /></span>
                  <span className="w-6 text-right text-muted">{distribution[n - 1]}</span>
                </li>
              ))}
            </ul>
          )}
          <Suspense fallback={null}>
            <WriteReview productId={productId} slug={slug} />
          </Suspense>
        </div>
        <ul className="flex flex-col divide-y divide-white/10">
          {reviews.map((r) => (
            <li key={r.id} className="flex flex-col gap-2 py-6 first:pt-0">
              <div className="flex flex-wrap items-center gap-3">
                <Stars value={r.rating} />
                {r.title && <p className="font-medium">{r.title}</p>}
              </div>
              <p className="text-muted leading-relaxed whitespace-pre-line">{r.body}</p>
              {r.photos.length > 0 && (
                <div className="flex gap-2">
                  {r.photos.map((p) => (
                    <a key={p.url} href={p.url} target="_blank" rel="noreferrer" className="relative size-20 overflow-hidden rounded-lg">
                      <Image src={p.url} alt={`Photo from ${r.name}`} fill sizes="80px" className="object-cover" />
                    </a>
                  ))}
                </div>
              )}
              <p className="text-muted flex flex-wrap items-center gap-2 text-xs">
                {r.name} · {date.format(new Date(r.date))}
                {r.verified && <span className="inline-flex items-center gap-1 text-accent"><BadgeCheck className="size-3.5" /> Verified purchase</span>}
              </p>
              {r.reply && <p className="mt-2 border-l-2 pl-3 text-sm" style={{ borderColor: "var(--z-primary)" }}><span className="text-fg">Aaliqadr:</span> <span className="text-muted">{r.reply}</span></p>}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

async function WriteReview({ productId, slug }: { productId: string; slug: string }) {
  const user = await getSessionUser();
  if (!user)
    return (
      <Link href={routes.login(`${routes.product(slug)}#reviews`)} className="self-start rounded-full border px-6 py-3 font-caps text-xs uppercase tracking-[0.2em] hover:bg-white/5" style={{ borderColor: "var(--z-primary)" }}>
        Sign in to review
      </Link>
    );
  const verified = /^[a-f0-9]{24}$/.test(productId) ? await hasBought(productId, user) : false;
  return <ReviewForm productId={productId} userId={user.id} verified={verified} />;
}
