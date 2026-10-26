"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Check, EyeOff, Loader2 } from "lucide-react";
import { bulkModerateReviewsAction } from "@/actions/admin/engagement";
import { btnSecondary } from "../ui";
import { toast } from "../kit/Toaster";
import { useFormSelection } from "../kit/useFormSelection";

export const REVIEW_FORM = "bulk-reviews";

/** Publish or hide the ticked reviews together. */
export function ReviewBulkBar() {
  const router = useRouter();
  const { ids, clear } = useFormSelection(REVIEW_FORM);
  const [pending, start] = useTransition();
  const run = (status: "approved" | "rejected") =>
    start(async () => {
      const res = await bulkModerateReviewsAction(ids, status);
      toast.result(res);
      if (res.ok) {
        clear();
        router.refresh();
      }
    });
  return (
    <>
      <form id={REVIEW_FORM} onSubmit={(e) => e.preventDefault()}>
        <label className="mb-2 inline-flex items-center gap-2 text-xs text-neutral-600">
          <input type="checkbox" data-select-all className="size-4" /> Select all on this page
        </label>
      </form>
      {ids.length > 0 && (
        <div className="sticky top-2 z-10 mb-2 flex flex-wrap items-center gap-2 rounded-lg border border-neutral-300 bg-white p-1.5 shadow-sm">
          <span className="px-2 text-sm font-medium">{ids.length} selected</span>
          <button type="button" className={`${btnSecondary} h-8`} disabled={pending} onClick={() => run("approved")}>{pending ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />} Publish</button>
          <button type="button" className={`${btnSecondary} h-8`} disabled={pending} onClick={() => run("rejected")}><EyeOff className="size-4" /> Hide</button>
          <button type="button" className="px-2 text-sm text-neutral-600 hover:text-neutral-900" onClick={clear}>Clear</button>
        </div>
      )}
    </>
  );
}
