"use client";

import dynamic from "next/dynamic";
import { useState } from "react";

const ReviewFormBody = dynamic(() => import("./ReviewFormBody").then((m) => m.ReviewFormBody), {
  ssr: false,
  loading: () => <div className="surface h-80 animate-pulse" aria-busy="true" />,
});

/** "Write a review": the form's code loads only when a shopper opens it. */
export function ReviewForm({ productId, userId, verified }: { productId: string; userId: string; verified: boolean }) {
  const [open, setOpen] = useState(false);
  if (open) return <ReviewFormBody productId={productId} userId={userId} verified={verified} onCancel={() => setOpen(false)} />;
  return (
    <button type="button" onClick={() => setOpen(true)} className="rounded-full border px-6 py-3 font-caps text-xs uppercase tracking-[0.2em] transition-colors hover:bg-white/5" style={{ borderColor: "var(--z-primary)" }}>
      Write a review
    </button>
  );
}
