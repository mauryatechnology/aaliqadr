"use client";

import { useEffect } from "react";
import { AlertCircle } from "lucide-react";
import type { FormState } from "@/actions/admin/shared";
import { toast } from "./kit/Toaster";

/**
 * Result of a form: success goes to a toast, which survives `router.refresh()` (bug B11);
 * an error stays inline next to the form, announced to screen readers.
 */
export function FormStatus({ state }: { state: FormState }) {
  useEffect(() => {
    if (state.ok && state.message) toast.success(state.message);
  }, [state]);
  if (state.error)
    return (
      <p role="alert" className="flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
        <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden /> {state.error}
      </p>
    );
  return null;
}
