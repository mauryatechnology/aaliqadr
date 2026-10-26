"use server";

import { createHash } from "node:crypto";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { Types } from "mongoose";
import { db } from "@/server/db/connect";
import { Product } from "@/server/models/Product";
import { Settings } from "@/server/models/commerce";
import { z } from "zod";
import { getSessionUser } from "@/server/auth";
import { rateLimit, RateLimitError } from "@/server/rate-limit";
import { getOrderForViewer } from "@/server/queries/account";
import { ReviewError, submitReview } from "@/server/services/reviews";
import { createReturn, ReturnError } from "@/server/services/returns";
import { Question, RETURN_REASONS, Review, ReviewVote } from "@/server/models/engagement";

/** Customer-side reviews and damage/leak claims (docs/05 §2.5, docs/08 §5–6). */

type Result = { ok: true; message: string; id?: string } | { ok: false; error: string };

const blobUrl = z.url({ protocol: /^https$/ }).refine((u) => new URL(u).hostname.endsWith(".public.blob.vercel-storage.com"), "Upload the file here");

const reviewInput = z
  .object({
    productId: z.string().regex(/^[a-f0-9]{24}$/),
    rating: z.number().int().min(1).max(5),
    title: z.string().trim().max(80),
    body: z.string().trim().min(20, "Tell us a little more (at least 20 characters)").max(2000).regex(/^[^<>]*$/, "No angle brackets, please"),
    photos: z.array(z.object({ url: blobUrl, width: z.number().int().positive(), height: z.number().int().positive() })).max(4),
  })
  .strict();

export async function submitReviewAction(raw: unknown): Promise<Result> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "Please sign in to write a review." };
  const parsed = reviewInput.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Please check your review." };
  try {
    await rateLimit("publicWrite", `review:${user.id}`);
    await submitReview(user, parsed.data);
    return { ok: true, message: "Thank you! Your review will appear once our team has read it." };
  } catch (e) {
    if (e instanceof ReviewError || e instanceof RateLimitError) return { ok: false, error: e.message };
    console.error(JSON.stringify({ evt: "review.submit.failed", error: (e as Error).message }));
    return { ok: false, error: "We couldn't save your review. Please try again." };
  }
}

const returnInput = z
  .object({
    orderId: z.string().regex(/^AQ-\d{6,}$/),
    accessKey: z.string().max(64).optional(),
    items: z.array(z.object({ sku: z.string().max(40), qty: z.number().int().min(1).max(20) })).min(1, "Choose the item with the problem").max(20),
    reason: z.enum(Object.keys(RETURN_REASONS) as [keyof typeof RETURN_REASONS, ...(keyof typeof RETURN_REASONS)[]]),
    description: z.string().trim().min(10, "Describe what happened (at least 10 characters)").max(1500).regex(/^[^<>]*$/, "No angle brackets, please"),
    evidence: z.array(z.object({ url: blobUrl, kind: z.enum(["image", "video"]) })).max(6),
  })
  .strict();

export async function submitReturnAction(raw: unknown): Promise<Result> {
  const parsed = returnInput.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Please check the form." };
  const v = parsed.data;
  const user = await getSessionUser();
  const found = await getOrderForViewer(v.orderId, user, v.accessKey);
  if (!found) return { ok: false, error: "Order not found." };
  try {
    await rateLimit("publicWrite", `return:${v.orderId}`);
    const r = await createReturn(v.orderId, { name: user?.name ?? found.order.contact.name, email: found.order.contact.email, userId: user?.id }, v);
    revalidatePath(`/order/${v.orderId}`);
    revalidatePath(`/account/orders/${v.orderId}`);
    return { ok: true, id: r._id, message: `Request ${r._id} received. We'll reply within 2 working days.` };
  } catch (e) {
    if (e instanceof ReturnError || e instanceof RateLimitError) return { ok: false, error: e.message };
    console.error(JSON.stringify({ evt: "return.create.failed", error: (e as Error).message }));
    return { ok: false, error: "We couldn't send your request. Please contact us." };
  }
}

// ── Helpful votes & product questions (plan.md §10.3) ───────────────────────

async function voterKey(): Promise<string> {
  const user = await getSessionUser();
  if (user) return `u:${user.id}`;
  const h = await headers();
  const raw = `${h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? ""}|${h.get("user-agent") ?? ""}`;
  // A one-way key: votes are deduplicated without storing the address.
  return `d:${createHash("sha256").update(raw).digest("base64url").slice(0, 22)}`;
}

export async function helpfulVoteAction(reviewId: string): Promise<{ ok: boolean }> {
  if (!/^[a-f0-9]{24}$/.test(reviewId)) return { ok: false };
  const voter = await voterKey();
  try {
    await rateLimit("publicWrite", `vote:${voter}`);
    await db();
    await ReviewVote.create({ reviewId: new Types.ObjectId(reviewId), voter });
    await Review.updateOne({ _id: reviewId, status: "approved" }, { $inc: { helpful: 1 } });
    return { ok: true };
  } catch {
    // Duplicate vote or rate limit: quietly ignored.
    return { ok: false };
  }
}

const questionInput = z.object({
  productId: z.string().regex(/^[a-f0-9]{24}$/),
  question: z.string().trim().min(10, "Write your question (at least a few words)").max(500).regex(/^[^<>]*$/, "No angle brackets, please"),
  name: z.string().trim().min(2, "Enter your name").max(60).regex(/^[^<>]*$/),
  email: z.email("Enter your email so we can tell you when it's answered"),
});

export async function askQuestionAction(raw: unknown): Promise<Result> {
  try {
    const user = await getSessionUser();
    const v = questionInput.safeParse({ ...(raw as object), ...(user ? { name: user.name, email: user.email } : {}) });
    if (!v.success) return { ok: false, error: v.error.issues[0]?.message ?? "Check your question." };
    await rateLimit("publicWrite", `question:${user?.id ?? v.data.email}`);
    await db();
    const p = await Product.findOne({ _id: v.data.productId, status: "active" }).select("slug name").lean();
    if (!p) return { ok: false, error: "This product isn't available." };
    const settings = await Settings.findById("store").select("qaEnabled").lean();
    if (!settings?.qaEnabled) return { ok: false, error: "Questions are closed right now." };
    await Question.create({ productId: p._id, productSlug: p.slug, productName: p.name, question: v.data.question, name: v.data.name, email: v.data.email.toLowerCase(), userId: user?.id, status: "pending" });
    return { ok: true, message: "Thanks! We'll answer soon and email you when we do." };
  } catch (e) {
    if (e instanceof RateLimitError) return { ok: false, error: e.message };
    console.error(JSON.stringify({ evt: "ask_question.failed", error: (e as Error).message }));
    return { ok: false, error: "Something went wrong. Please try again." };
  }
}
