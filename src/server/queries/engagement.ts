import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { Types } from "mongoose";
import { db, isDatabaseConfigured } from "@/server/db/connect";
import { Content, Review, type ContentDoc, type PolicyKey, type ReviewDoc } from "@/server/models/engagement";

/** Cached storefront reads for reviews and CMS content (docs/03 §5). */

export const engagementTags = {
  reviews: (productId: string) => `reviews:${productId}`,
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
    })),
  };
}

export type StorefrontContent = Pick<ContentDoc, "announcement" | "banners" | "faqs" | "policies">;

const EMPTY: StorefrontContent = { announcement: { text: "", active: false }, banners: [], faqs: [], policies: {} };

export async function getContent(): Promise<StorefrontContent> {
  "use cache";
  cacheLife("content");
  cacheTag(engagementTags.content);
  if (!isDatabaseConfigured()) return EMPTY;
  await db();
  const doc = await Content.findById("storefront").lean<ContentDoc>();
  if (!doc) return EMPTY;
  return JSON.parse(JSON.stringify({ announcement: doc.announcement ?? EMPTY.announcement, banners: doc.banners ?? [], faqs: doc.faqs ?? [], policies: doc.policies ?? {} })) as StorefrontContent;
}

export async function getPolicy(key: PolicyKey) {
  return (await getContent()).policies[key];
}
