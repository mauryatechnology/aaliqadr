"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { EyeOff, Loader2 } from "lucide-react";
import { answerQuestionAction, setQuestionStatusAction } from "@/actions/admin/engagement";
import { Badge, btnPrimary, btnSecondary, inputCls } from "../ui";
import { toast } from "../kit/Toaster";
import { RelativeTime } from "../kit/Bits";

export function QuestionCard({ q }: { q: { id: string; productName: string; productSlug: string; question: string; name: string; email: string; status: string; answer: string; at: string } }) {
  const router = useRouter();
  const [answer, setAnswer] = useState(q.answer);
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<{ ok?: boolean; error?: string; message?: string }>) =>
    start(async () => {
      const res = await fn();
      toast.result(res);
      if (res.ok) router.refresh();
    });
  return (
    <article data-list-row className="flex flex-col gap-3 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-medium">{q.question}</p>
          <p className="text-xs text-neutral-500">
            <a href={`/perfume/${q.productSlug}#questions`} target="_blank" rel="noreferrer" className="hover:underline">{q.productName}</a> · {q.name} ({q.email}) · <RelativeTime date={q.at} />
          </p>
        </div>
        <Badge tone={q.status === "answered" ? "green" : q.status === "pending" ? "amber" : "neutral"}>{q.status}</Badge>
      </div>
      <textarea className={`${inputCls} h-auto py-2`} rows={3} maxLength={2000} value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder="Your answer (shown publicly)" aria-label="Answer" />
      <div className="flex flex-wrap gap-2">
        <button type="button" className={btnPrimary} disabled={pending || !answer.trim()} onClick={() => run(() => answerQuestionAction(q.id, answer))}>{pending && <Loader2 className="size-4 animate-spin" />} {q.status === "answered" ? "Update answer" : "Answer & publish"}</button>
        {q.status !== "hidden" && <button type="button" className={btnSecondary} disabled={pending} onClick={() => run(() => setQuestionStatusAction(q.id, "hidden"))}><EyeOff className="size-4" /> Hide</button>}
        {q.status === "hidden" && <button type="button" className={btnSecondary} disabled={pending} onClick={() => run(() => setQuestionStatusAction(q.id, "pending"))}>Restore</button>}
      </div>
    </article>
  );
}
