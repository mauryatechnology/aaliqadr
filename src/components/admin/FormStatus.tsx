import { CheckCircle2, AlertCircle } from "lucide-react";
import type { FormState } from "@/actions/admin/shared";

/** Inline result line under a form: announced to screen readers, never a browser alert. */
export function FormStatus({ state }: { state: FormState }) {
  if (state.error)
    return (
      <p role="alert" className="flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
        <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden /> {state.error}
      </p>
    );
  if (state.ok && state.message)
    return (
      <p role="status" className="flex items-start gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
        <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden /> {state.message}
      </p>
    );
  return null;
}
