"use client";

import { useState } from "react";
import { helpfulVoteAction } from "@/actions/engagement";
import { cx } from "@/lib/cx";
import type { PublicReview } from "@/server/queries/engagement";

function BadgeCheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

function ThumbsUpIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M7 10v12" />
      <path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z" />
    </svg>
  );
}

function StarIcon({ className, fill, style }: { className?: string; fill?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" fill={fill ?? "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}

/** Reviews 2.0 (plan.md §10.3): photo strip, filters, sort and helpful votes. */

const date = new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeZone: "Asia/Kolkata" });

function Stars({ value }: { value: number }) {
  return (
    <span className="flex" aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => <StarIcon key={n} className="size-4" style={{ color: "var(--z-primary)" }} fill={n <= Math.round(value) ? "currentColor" : "none"} />)}
    </span>
  );
}

const chip = (on: boolean) => cx("rounded-full border px-3 py-1 text-xs transition-colors", on ? "border-gold bg-gold text-obsidian" : "border-white/15 hover:border-gold/60");

export function ReviewList({ reviews }: { reviews: PublicReview[] }) {
  const [rating, setRating] = useState(0);
  const [verified, setVerified] = useState(false);
  const [photos, setPhotos] = useState(false);
  const [sort, setSort] = useState<"newest" | "helpful">("newest");
  const [voted, setVoted] = useState<Record<string, boolean>>({});
  const shown = reviews
    .filter((r) => (!rating || r.rating === rating) && (!verified || r.verified) && (!photos || r.photos.length > 0))
    .toSorted((a, b) => (sort === "helpful" ? b.helpful + (voted[b.id] ? 1 : 0) - (a.helpful + (voted[a.id] ? 1 : 0)) || b.date.localeCompare(a.date) : b.date.localeCompare(a.date)));
  const strip = reviews.flatMap((r) => r.photos.map((p) => ({ ...p, by: r.name })));

  if (!reviews.length) return null;
  return (
    <div className="flex flex-col gap-5">
      {strip.length > 0 && (
        <ul aria-label="Customer photos" className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:thin]">
          {strip.slice(0, 20).map((p) => (
            <li key={p.url} className="shrink-0">
              <a href={p.url} target="_blank" rel="noreferrer" className="relative block size-20 overflow-hidden rounded-lg">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.url} alt={`Photo from ${p.by}`} className="size-full object-cover" loading="lazy" />
              </a>
            </li>
          ))}
        </ul>
      )}
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filter reviews">
        {[5, 4, 3, 2, 1].map((n) => (
          <button key={n} type="button" aria-pressed={rating === n} onClick={() => setRating(rating === n ? 0 : n)} className={chip(rating === n)}>{n} ★</button>
        ))}
        <button type="button" aria-pressed={verified} onClick={() => setVerified(!verified)} className={chip(verified)}>Verified</button>
        <button type="button" aria-pressed={photos} onClick={() => setPhotos(!photos)} className={chip(photos)}>With photos</button>
        <label className="ml-auto flex items-center gap-2 text-xs text-muted">
          Sort
          <select value={sort} onChange={(e) => setSort(e.target.value as "newest" | "helpful")} className="rounded-full border border-white/15 bg-transparent px-2 py-1 text-fg [&>option]:bg-[var(--z-bg)]">
            <option value="newest">Newest</option>
            <option value="helpful">Most helpful</option>
          </select>
        </label>
      </div>
      <p className="sr-only" aria-live="polite">{shown.length} reviews shown</p>
      <ul className="flex flex-col divide-y divide-white/10">
        {shown.map((r) => (
          <li key={r.id} className="flex flex-col gap-2 py-6 first:pt-0">
            <div className="flex flex-wrap items-center gap-3">
              <Stars value={r.rating} />
              {r.title && <p className="font-medium">{r.title}</p>}
            </div>
            <p className="text-muted whitespace-pre-line leading-relaxed">{r.body}</p>
            {r.photos.length > 0 && (
              <div className="flex gap-2">
                {r.photos.map((p) => (
                  <a key={p.url} href={p.url} target="_blank" rel="noreferrer" className="relative size-20 overflow-hidden rounded-lg">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.url} alt={`Photo from ${r.name}`} className="size-full object-cover" loading="lazy" />
                  </a>
                ))}
              </div>
            )}
            <p className="text-muted flex flex-wrap items-center gap-2 text-xs">
              {r.name} · {date.format(new Date(r.date))}
              {r.verified && <span className="inline-flex items-center gap-1 text-accent"><BadgeCheckIcon className="size-3.5" /> Verified purchase</span>}
            </p>
            {r.reply && <p className="mt-2 border-l-2 pl-3 text-sm" style={{ borderColor: "var(--z-primary)" }}><span className="text-fg">Aaliqadr:</span> <span className="text-muted">{r.reply}</span></p>}
            <button
              type="button"
              disabled={voted[r.id]}
              onClick={async () => {
                setVoted({ ...voted, [r.id]: true });
                await helpfulVoteAction(r.id);
              }}
              className="inline-flex items-center gap-1.5 self-start text-xs text-muted hover:text-fg disabled:text-accent"
            >
              <ThumbsUpIcon className="size-3.5" /> Helpful{r.helpful + (voted[r.id] ? 1 : 0) > 0 ? ` (${r.helpful + (voted[r.id] ? 1 : 0)})` : ""}
            </button>
          </li>
        ))}
        {shown.length === 0 && <li className="py-6 text-sm text-muted">No reviews match these filters.</li>}
      </ul>
    </div>
  );
}
