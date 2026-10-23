"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { moveReturnAction } from "@/actions/admin/engagement";
import type { FormState } from "@/actions/admin/shared";
import { cn } from "@/lib/cn";
import { btnPrimary, btnSecondary, FieldLabel, inputCls } from "../ui";
import { FormStatus } from "../FormStatus";

const LABEL: Record<string, string> = { approved: "Approve", rejected: "Reject", received: "Mark item received", refunded: "Refund", replaced: "Replacement shipped", closed: "Close" };

/** The next steps for a claim, each with only the fields it needs. */
export function ReturnActions({ id, next, resolution, maxRefund, suggestedRefund, isCod, canRefund }: { id: string; next: string[]; resolution?: string; maxRefund: number; suggestedRefund: number; isCod: boolean; canRefund: boolean }) {
  const router = useRouter();
  const [to, setTo] = useState(next[0] ?? "");
  const [f, setF] = useState({ resolution: resolution ?? "replacement", note: "", amount: String(suggestedRefund), reference: "", courier: "", awb: "" });
  const [state, setState] = useState<FormState>({});
  const [pending, start] = useTransition();
  if (!next.length) return <p className="text-sm text-neutral-600">This request is finished.</p>;

  const submit = () =>
    start(async () => {
      const payload =
        to === "approved" ? { to, resolution: f.resolution, note: f.note || undefined }
        : to === "refunded" ? { to, amount: Number(f.amount), note: f.note || undefined, reference: f.reference || undefined }
        : to === "replaced" ? { to, courier: f.courier, awb: f.awb, note: f.note || undefined }
        : { to, note: f.note || undefined };
      const res = await moveReturnAction(id, payload);
      setState(res);
      if (res.ok) router.refresh();
    });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Next step">
        {next.filter((n) => n !== "refunded" || canRefund).map((n) => (
          <button key={n} type="button" role="radio" aria-checked={to === n} onClick={() => setTo(n)} className={cn("rounded-lg border px-3 py-1.5 text-sm", to === n ? "border-neutral-900 bg-neutral-900 text-white" : "border-neutral-300 hover:border-neutral-500")}>{LABEL[n] ?? n}</button>
        ))}
      </div>
      {to === "approved" && (
        <FieldLabel label="Resolution">
          <select className={inputCls} value={f.resolution} onChange={(e) => setF({ ...f, resolution: e.target.value })}>
            <option value="replacement">Send a replacement</option>
            <option value="refund">Refund</option>
          </select>
        </FieldLabel>
      )}
      {to === "refunded" && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <FieldLabel label="Amount ₹" hint={`Up to ₹${(maxRefund / 100).toFixed(2)} is still refundable on this order.`}>
            <input type="number" min={1} step="0.01" className={inputCls} value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} />
          </FieldLabel>
          {isCod ? (
            <FieldLabel label="UPI / bank reference" hint="COD orders are refunded outside Razorpay; record the transfer.">
              <input className={inputCls} value={f.reference} onChange={(e) => setF({ ...f, reference: e.target.value })} />
            </FieldLabel>
          ) : (
            <p className="self-end pb-2 text-xs text-neutral-600">Refunded through Razorpay to the original payment method.</p>
          )}
        </div>
      )}
      {to === "replaced" && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <FieldLabel label="Courier"><input className={inputCls} value={f.courier} onChange={(e) => setF({ ...f, courier: e.target.value })} placeholder="Delhivery" /></FieldLabel>
          <FieldLabel label="AWB / tracking number"><input className={`${inputCls} font-mono`} value={f.awb} onChange={(e) => setF({ ...f, awb: e.target.value })} /></FieldLabel>
        </div>
      )}
      <FieldLabel label={to === "rejected" ? "Reason (sent to the customer)" : "Note (optional; sent to the customer for approvals)"}>
        <textarea rows={2} maxLength={500} className={`${inputCls} h-auto py-2`} value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} />
      </FieldLabel>
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" className={to === "rejected" ? btnSecondary : btnPrimary} disabled={pending || !to} onClick={submit}>{pending && <Loader2 className="size-4 animate-spin" />} {LABEL[to] ?? "Save"}</button>
        <FormStatus state={state} />
      </div>
    </div>
  );
}
