"use client";

import { useState, useTransition } from "react";
import { IndianRupee, Loader2, Pencil } from "lucide-react";
import { editOrderDeliveryAction, partialRefundAction } from "@/actions/admin/orders";
import { INDIAN_STATES } from "@/config/india";
import { formatPrice } from "@/lib/money";
import { stateFromPincode } from "@/lib/pincode";
import { btnPrimary, btnSecondary, FieldLabel, inputCls } from "./ui";
import { ConfirmDialog, Drawer } from "./kit/Dialog";
import { toast } from "./kit/Toaster";

/** Before-dispatch corrections and partial refunds on the order page (plan.md §5, bug B8). */

type Address = { fullName: string; phone: string; line1: string; line2: string; landmark: string; city: string; stateCode: string; pincode: string };

export function EditDeliveryButton({ orderId, address, giftMessage, giftWrap, stateLocked }: { orderId: string; address: Address; giftMessage?: string; giftWrap: boolean; stateLocked: boolean }) {
  const [open, setOpen] = useState(false);
  const [a, setA] = useState(address);
  const [msg, setMsg] = useState(giftMessage ?? "");
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const f = (k: keyof Address, label: string, wide = false) => (
    <FieldLabel label={label} className={wide ? "sm:col-span-2" : undefined}>
      <input className={inputCls} value={a[k]} onChange={(e) => setA({ ...a, [k]: e.target.value })} />
    </FieldLabel>
  );
  return (
    <>
      <button type="button" className="inline-flex items-center gap-1 text-sm font-medium text-neutral-700 hover:text-neutral-900" onClick={() => setOpen(true)}><Pencil className="size-3.5" /> Edit</button>
      <Drawer
        open={open}
        onClose={() => setOpen(false)}
        title="Edit delivery details"
        footer={
          <div className="flex justify-end gap-2">
            <button type="button" className={btnSecondary} onClick={() => setOpen(false)}>Cancel</button>
            <button
              type="button"
              className={btnPrimary}
              disabled={pending}
              onClick={() =>
                start(async () => {
                  const res = await editOrderDeliveryAction(orderId, { address: a, ...(giftWrap ? { giftMessage: msg } : {}) });
                  if (res.error) return setError(res.error);
                  toast.result(res);
                  setOpen(false);
                })
              }
            >
              {pending && <Loader2 className="size-4 animate-spin" />} Save
            </button>
          </div>
        }
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <p className="text-sm text-neutral-600 sm:col-span-2">Corrections the customer asked for, before dispatch. The customer sees &ldquo;Delivery details updated&rdquo; on their order; the old details stay in the activity log.</p>
          {f("fullName", "Recipient")}
          {f("phone", "Mobile")}
          {f("line1", "House / flat, street", true)}
          {f("line2", "Area / locality")}
          {f("landmark", "Landmark")}
          <FieldLabel label="PIN code">
            <input
              className={inputCls}
              inputMode="numeric"
              maxLength={6}
              value={a.pincode}
              onChange={(e) => {
                const pincode = e.target.value.replace(/\D/g, "");
                const guess = stateLocked ? undefined : stateFromPincode(pincode);
                setA({ ...a, pincode, ...(guess ? { stateCode: guess } : {}) });
              }}
            />
          </FieldLabel>
          {f("city", "City")}
          <FieldLabel label="State" className="sm:col-span-2" hint={stateLocked ? "Fixed: the tax invoice is issued for this state." : undefined}>
            <select className={inputCls} value={a.stateCode} disabled={stateLocked} onChange={(e) => setA({ ...a, stateCode: e.target.value })}>
              {INDIAN_STATES.map((s) => <option key={s.code} value={s.code}>{s.name}</option>)}
            </select>
          </FieldLabel>
          {giftWrap && (
            <FieldLabel label="Gift message" className="sm:col-span-2">
              <textarea className={`${inputCls} h-auto py-2`} rows={3} maxLength={250} value={msg} onChange={(e) => setMsg(e.target.value)} />
            </FieldLabel>
          )}
          {error && <p role="alert" className="text-sm text-red-700 sm:col-span-2">{error}</p>}
        </div>
      </Drawer>
    </>
  );
}

export function PartialRefundButton({ orderId, refundableP, cod }: { orderId: string; refundableP: number; cod: boolean }) {
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [v, setV] = useState({ amount: "", reason: "", reference: "" });
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const amount = Number(v.amount);
  const valid = amount > 0 && amount * 100 <= refundableP && v.reason.trim().length >= 3 && (!cod || v.reference.trim());
  return (
    <>
      <button type="button" className={`${btnSecondary} w-full`} onClick={() => setOpen(true)}><IndianRupee className="size-4" /> Partial refund</button>
      <Drawer
        open={open}
        onClose={() => setOpen(false)}
        title="Refund part of this order"
        footer={
          <div className="flex justify-end gap-2">
            <button type="button" className={btnSecondary} onClick={() => setOpen(false)}>Cancel</button>
            <button type="button" className={btnPrimary} disabled={!valid} onClick={() => setConfirm(true)}>Review refund</button>
          </div>
        }
      >
        <div className="flex flex-col gap-3 text-sm">
          <p className="text-neutral-600">For goodwill or a missing extra. Damage and leaks go through a claim instead. Up to {formatPrice(refundableP)} can still be refunded.</p>
          <FieldLabel label="Amount ₹"><input className={inputCls} type="number" min={1} step="0.01" value={v.amount} onChange={(e) => setV({ ...v, amount: e.target.value })} /></FieldLabel>
          <FieldLabel label="Reason (shown to the customer)"><input className={inputCls} value={v.reason} maxLength={200} onChange={(e) => setV({ ...v, reason: e.target.value })} /></FieldLabel>
          {cod && <FieldLabel label="UPI / bank reference" hint="COD refunds are paid by you directly; record the reference."><input className={inputCls} value={v.reference} maxLength={80} onChange={(e) => setV({ ...v, reference: e.target.value })} /></FieldLabel>}
          {error && <p role="alert" className="text-red-700">{error}</p>}
        </div>
      </Drawer>
      <ConfirmDialog
        open={confirm}
        title={`Refund ${formatPrice(Math.round(amount * 100) || 0)}?`}
        confirmLabel="Refund"
        pending={pending}
        onCancel={() => setConfirm(false)}
        onConfirm={() =>
          start(async () => {
            const res = await partialRefundAction(orderId, { amount, reason: v.reason, reference: v.reference || undefined });
            setConfirm(false);
            if (res.error) return setError(res.error);
            toast.result(res);
            setOpen(false);
          })
        }
      >
        {cod ? `Recorded as paid by UPI/bank, reference ${v.reference}.` : "Sent back to the customer's original payment method through Razorpay. This can't be undone."}
      </ConfirmDialog>
    </>
  );
}
