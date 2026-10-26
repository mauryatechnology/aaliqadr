"use client";

import { useState, useTransition } from "react";
import { askQuestionAction } from "@/actions/engagement";

const field = "h-11 w-full rounded-lg border border-white/15 bg-white/5 px-3 text-sm text-fg placeholder:text-muted focus:border-gold focus:outline-none";

function Spinner() {
  return (
    <svg className="size-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}

export function AskQuestionBody({
  productId,
  signedIn,
  onCancel,
}: {
  productId: string;
  signedIn: boolean;
  onCancel?: () => void;
}) {
  const [v, setV] = useState({ question: "", name: "", email: "" });
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const res = await askQuestionAction({ productId, ...v });
          setMsg(res.ok ? { ok: true, text: res.message } : { ok: false, text: res.error });
          if (res.ok) setV({ question: "", name: "", email: "" });
        });
      }}
    >
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-muted">Your question</span>
        <textarea rows={3} maxLength={500} required value={v.question} onChange={(e) => setV({ ...v, question: e.target.value })} className={`${field} h-auto py-2`} />
      </label>
      {!signedIn && (
        <>
          <input aria-label="Your name" placeholder="Your name" required value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} className={field} autoComplete="name" />
          <input aria-label="Your email" type="email" placeholder="Email (to tell you when it's answered)" required value={v.email} onChange={(e) => setV({ ...v, email: e.target.value })} className={field} autoComplete="email" />
        </>
      )}
      <div className="flex items-center gap-3">
        <button type="submit" disabled={pending} className="btn-gold inline-flex h-11 items-center justify-center gap-2 rounded-full px-6 text-xs uppercase tracking-[0.18em]">
          {pending && <Spinner />} Ask
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className="h-11 rounded-full border border-white/20 px-4 text-xs uppercase tracking-[0.18em] text-muted hover:text-fg">
            Cancel
          </button>
        )}
      </div>
      {msg && <p role={msg.ok ? "status" : "alert"} className={msg.ok ? "text-sm text-accent" : "text-sm text-red-300"}>{msg.text}</p>}
      <p className="text-xs text-muted">Questions appear here once we&apos;ve answered them. Your email is never shown.</p>
    </form>
  );
}
