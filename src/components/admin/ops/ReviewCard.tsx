"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { BadgeCheck, Check, EyeOff, Loader2, Star } from "lucide-react";
import { deleteReviewAction, moderateReviewAction, replyReviewAction } from "@/actions/admin/engagement";
import type { FormState } from "@/actions/admin/shared";
import { Badge, btnPrimary, btnSecondary, inputCls } from "../ui";
import { FormStatus } from "../FormStatus";
import { ConfirmButton } from "../widgets";

export interface ReviewRow {
  id: string;
  productName: string;
  productSlug: string;
  name: string;
  email: string;
  rating: number;
  title: string;
  body: string;
  photos: { url: string }[];
  verified: boolean;
  status: string;
  reply: string;
  createdAt: string;
}

export function ReviewCard({ r, canDelete }: { r: ReviewRow; canDelete: boolean }) {
  const router = useRouter();
  const [state, setState] = useState<FormState>({});
  const [reply, setReply] = useState(r.reply);
  const [replying, setReplying] = useState(false);
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<FormState>) => start(async () => { const res = await fn(); setState(res); if (res.ok) router.refresh(); });

  return (
    <article className="flex flex-col gap-3 rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-sm font-medium">
            <span className="flex text-amber-500" aria-label={`${r.rating} stars`}>{[1, 2, 3, 4, 5].map((n) => <Star key={n} className="size-4" fill={n <= r.rating ? "currentColor" : "none"} />)}</span>
            {r.title}
          </p>
          <p className="mt-1 text-xs text-neutral-500">
            {r.productName} · {r.name} ({r.email}) · {new Date(r.createdAt).toLocaleDateString("en-IN")}
            {r.verified && <span className="ml-2 inline-flex items-center gap-1 text-emerald-700"><BadgeCheck className="size-3.5" /> Verified purchase</span>}
          </p>
        </div>
        <Badge tone={r.status === "approved" ? "green" : r.status === "pending" ? "amber" : "neutral"}>{r.status}</Badge>
      </div>
      <p className="whitespace-pre-line text-sm text-neutral-800">{r.body}</p>
      {r.photos.length > 0 && (
        <div className="flex gap-2">
          {r.photos.map((p) => <a key={p.url} href={p.url} target="_blank" rel="noreferrer" className="relative size-16 overflow-hidden rounded-md"><Image src={p.url} alt="" fill sizes="64px" className="object-cover" /></a>)}
        </div>
      )}
      {replying ? (
        <div className="flex flex-col gap-2">
          <textarea className={`${inputCls} h-auto py-2`} rows={3} maxLength={1000} value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Thank you for… (shown publicly under the review)" />
          <div className="flex gap-2">
            <button type="button" className={btnPrimary} disabled={pending} onClick={() => run(async () => { const res = await replyReviewAction(r.id, reply); if (res.ok) setReplying(false); return res; })}>Save reply</button>
            <button type="button" className={btnSecondary} onClick={() => setReplying(false)}>Cancel</button>
          </div>
        </div>
      ) : r.reply ? (
        <p className="border-l-2 border-neutral-300 pl-3 text-sm text-neutral-600"><span className="font-medium">Your reply:</span> {r.reply}</p>
      ) : null}
      <div className="flex flex-wrap items-center gap-2">
        {r.status !== "approved" && <button type="button" className={btnPrimary} disabled={pending} onClick={() => run(() => moderateReviewAction(r.id, "approved"))}>{pending ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />} Publish</button>}
        {r.status !== "rejected" && <button type="button" className={btnSecondary} disabled={pending} onClick={() => run(() => moderateReviewAction(r.id, "rejected"))}><EyeOff className="size-4" /> Hide</button>}
        {!replying && <button type="button" className={btnSecondary} onClick={() => setReplying(true)}>{r.reply ? "Edit reply" : "Reply"}</button>}
        {canDelete && <ConfirmButton confirm="Delete this review permanently?" action={() => deleteReviewAction(r.id)} onDone={(res) => { setState(res); router.refresh(); }}>Delete</ConfirmButton>}
        <FormStatus state={state} />
      </div>
    </article>
  );
}
