"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { Eye } from "lucide-react";

/** The card's quick-view button; the dialog's code loads on first use (plan.md §10.2). */

const QuickViewDialog = dynamic(() => import("./QuickViewDialog").then((m) => m.QuickViewDialog), { ssr: false });

export function QuickViewButton({ slug, name }: { slug: string; name: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Quick view of ${name}`}
        aria-haspopup="dialog"
        className="hidden size-9 place-items-center rounded-full bg-black/45 text-ivory opacity-0 backdrop-blur transition-opacity hover:bg-black/65 focus-visible:opacity-100 group-hover:opacity-100 group-focus-within:opacity-100 [@media(hover:hover)]:grid"
      >
        <Eye className="size-4" aria-hidden />
      </button>
      {open && <QuickViewDialog slug={slug} onClose={() => setOpen(false)} />}
    </>
  );
}
