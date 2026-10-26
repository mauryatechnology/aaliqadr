"use client";

import dynamic from "next/dynamic";
import { useState } from "react";

const AskQuestionBody = dynamic(
  () => import("./AskQuestionBody").then((m) => m.AskQuestionBody),
  {
    ssr: false,
    loading: () => <div className="h-44 w-full animate-pulse rounded-lg bg-white/5" aria-busy="true" />,
  }
);

export function AskQuestion({ productId, signedIn }: { productId: string; signedIn: boolean }) {
  const [open, setOpen] = useState(false);

  if (open) {
    return <AskQuestionBody productId={productId} signedIn={signedIn} onCancel={() => setOpen(false)} />;
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted">Have a question about notes, projection, or layering?</p>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-full border px-6 py-3 font-caps text-xs uppercase tracking-[0.2em] transition-colors hover:bg-white/5 self-start"
        style={{ borderColor: "var(--z-primary)" }}
      >
        Ask a question
      </button>
    </div>
  );
}
