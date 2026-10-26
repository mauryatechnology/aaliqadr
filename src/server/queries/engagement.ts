import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { Types } from "mongoose";
import { db, isDatabaseConfigured } from "@/server/db/connect";
import { Content, Question, Review, type ContentDoc, type PolicyKey, type QuestionDoc, type ReviewDoc } from "@/server/models/engagement";

/** Cached storefront reads for reviews and CMS content (docs/03 §5). */

export const engagementTags = {
  reviews: (productId: string) => `reviews:${productId}`,
  questions: (productId: string) => `questions:${productId}`,
  content: "content",
};

export interface PublicReview {
  id: string;
  name: string;
  rating: number;
  title: string;
  body: string;
  photos: { url: string; width: number; height: number }[];
  verified: boolean;
  reply?: string;
  date: string;
  helpful: number;
}

export async function getProductReviews(productId: string): Promise<{ reviews: PublicReview[]; distribution: number[] }> {
  "use cache";
  cacheLife("catalog");
  cacheTag(engagementTags.reviews(productId));
  if (!isDatabaseConfigured() || !Types.ObjectId.isValid(productId)) return { reviews: [], distribution: [0, 0, 0, 0, 0] };
  await db();
  const docs = await Review.find({ productId: new Types.ObjectId(productId), status: "approved" }).sort({ createdAt: -1 }).limit(60).lean<ReviewDoc[]>();
  const distribution = [0, 0, 0, 0, 0];
  for (const d of docs) distribution[d.rating - 1]!++;
  return {
    distribution,
    reviews: docs.map((d) => ({
      id: String(d._id),
      // First name and initial only: reviews are public.
      name: `${d.name.split(" ")[0] ?? "Customer"}${d.name.split(" ")[1] ? ` ${d.name.split(" ")[1]![0]}.` : ""}`,
      rating: d.rating,
      title: d.title,
      body: d.body,
      photos: d.photos ?? [],
      verified: d.verified,
      reply: d.reply?.body,
      date: d.createdAt.toISOString(),
      helpful: d.helpful ?? 0,
    })),
  };
}

export type StorefrontContent = Pick<ContentDoc, "announcement" | "banners" | "faqs" | "policies"> & { search: { popular: string[]; synonyms: string[][] } };

const EMPTY: StorefrontContent = { announcement: { text: "", active: false }, banners: [], faqs: [], policies: {}, search: { popular: [], synonyms: [] } };

export async function getContent(): Promise<StorefrontContent> {
  "use cache";
  cacheLife("content");
  cacheTag(engagementTags.content);
  if (!isDatabaseConfigured()) return EMPTY;
  await db();
  const doc = await Content.findById("storefront").lean<ContentDoc>();
  if (!doc) return EMPTY;
  // Scheduled items (plan.md §5): show only inside their window, and come back exactly when
  // the next one starts or ends.
  const now = Date.now();
  const t = (s?: string) => (s ? Date.parse(s) : NaN);
  const live = (x: { active: boolean; startsAt?: string; endsAt?: string }) => x.active && !(t(x.startsAt) > now) && !(t(x.endsAt) <= now);
  const a = doc.announcement ?? EMPTY.announcement;
  const banners = doc.banners ?? [];
  const next = [a, ...banners].flatMap((x) => [t(x.startsAt), t(x.endsAt)]).filter((x) => x > now);
  if (next.length) cacheLife({ stale: 60, revalidate: Math.max(60, Math.ceil((Math.min(...next) - now) / 1000)), expire: 60 * 60 * 24 * 30 });
  return JSON.parse(JSON.stringify({ announcement: { ...a, active: live(a) }, banners: banners.filter(live), faqs: doc.faqs ?? [], policies: doc.policies ?? {}, search: { popular: doc.search?.popular ?? [], synonyms: doc.search?.synonyms ?? [] } })) as StorefrontContent;
}

export async function getPolicy(key: PolicyKey) {
  return (await getContent()).policies[key];
}

export interface PublicQuestion {
  id: string;
  question: string;
  name: string;
  answer: string;
  date: string;
}

/** Answered questions for a product page (plan.md §10.3). */
export async function getProductQuestions(productId: string): Promise<PublicQuestion[]> {
  "use cache";
  cacheLife("catalog");
  cacheTag(engagementTags.questions(productId));
  if (!isDatabaseConfigured() || !Types.ObjectId.isValid(productId)) return [];
  await db();
  const docs = await Question.find({ productId: new Types.ObjectId(productId), status: "answered" }).sort({ createdAt: -1 }).limit(40).lean<QuestionDoc[]>();
  return docs.map((d) => ({ id: String(d._id), question: d.question, name: d.name.split(" ")[0] ?? "Customer", answer: d.answer?.body ?? "", date: d.createdAt.toISOString() }));
}
