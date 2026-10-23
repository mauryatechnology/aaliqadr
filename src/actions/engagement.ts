"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSessionUser } from "@/server/auth";
import { rateLimit, RateLimitError } from "@/server/rate-limit";
import { getOrderForViewer } from "@/server/queries/account";
import { ReviewError, submitReview } from "@/server/services/reviews";
import { createReturn, ReturnError } from "@/server/services/returns";
import { RETURN_REASONS } from "@/server/models/engagement";

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
