"use client";

import { useActionState, useState } from "react";
import { Loader2, PackageCheck, Truck, XCircle } from "lucide-react";
import { addOrderNoteAction, advanceOrderAction, cancelOrderAdminAction } from "@/actions/admin/orders";
import type { FormState } from "@/actions/admin/shared";
import type { OrderStatus } from "@/lib/order-status";
import { btnDanger, btnPrimary, btnSecondary, FieldLabel, inputCls } from "./ui";
import { FormStatus } from "./FormStatus";

const idle: FormState = {};
const COURIERS = ["Delhivery", "Blue Dart", "DTDC", "Ekart", "Xpressbees", "India Post", "Shadowfax", "Self delivery"];

export function OrderAdminActions({ orderId, status, canCancel, paidOnline }: { orderId: string; status: OrderStatus; canCancel: boolean; paidOnline: boolean }) {
  const [advanceState, advance, advancing] = useActionState(advanceOrderAction, idle);
  const [cancelState, cancel, cancelling] = useActionState(cancelOrderAdminAction, idle);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const fe = (k: string) => advanceState.fieldErrors?.[k]?.[0];
  const canShip = status === "confirmed" || status === "processing";
  const cancellable = status === "pending_payment" || status === "confirmed" || status === "processing";

  return (
    <div className="flex flex-col gap-5">
      {status === "confirmed" && (
        <form action={advance}>
          <input type="hidden" name="orderId" value={orderId} />
          <input type="hidden" name="to" value="processing" />
          <button type="submit" disabled={advancing} className={`${btnSecondary} w-full`}>
            {advancing ? <Loader2 className="size-4 animate-spin" /> : <PackageCheck className="size-4" />} Start packing
          </button>
        </form>
      )}

      {canShip && (
        <form action={advance} className="flex flex-col gap-3 rounded-lg border border-neutral-200 p-4">
          <p className="flex items-center gap-2 text-sm font-semibold"><Truck className="size-4" aria-hidden /> Ship this order</p>
          <input type="hidden" name="orderId" value={orderId} />
          <input type="hidden" name="to" value="shipped" />
          <FieldLabel label="Courier" error={fe("courier")}>
            <input name="courier" list="couriers" className={inputCls} placeholder="e.g. Delhivery" required />
            <datalist id="couriers">{COURIERS.map((c) => <option key={c} value={c} />)}</datalist>
          </FieldLabel>
          <FieldLabel label="Tracking (AWB) number" error={fe("awb")}>
            <input name="awb" className={`${inputCls} font-mono`} required />
          </FieldLabel>
          <FieldLabel label="Tracking link (optional)" error={fe("trackingUrl")} hint="Shown to the customer and in their email.">
            <input name="trackingUrl" type="url" className={inputCls} placeholder="https://" />
          </FieldLabel>
          <button type="submit" disabled={advancing} className={btnPrimary}>
            {advancing && <Loader2 className="size-4 animate-spin" />} Mark shipped & email customer
          </button>
        </form>
      )}

      {status === "shipped" && (
        <form action={advance}>
          <input type="hidden" name="orderId" value={orderId} />
          <input type="hidden" name="to" value="delivered" />
          <button type="submit" disabled={advancing} className={`${btnPrimary} w-full`}>
            {advancing && <Loader2 className="size-4 animate-spin" />} Mark delivered
          </button>
        </form>
      )}
      <FormStatus state={advanceState} />

      {cancellable && canCancel && (
        <div className="border-t border-neutral-200 pt-4">
          {confirmCancel ? (
            <form action={cancel} className="flex flex-col gap-3">
              <input type="hidden" name="orderId" value={orderId} />
              <FieldLabel label="Reason (shown to the customer)" error={cancelState.fieldErrors?.reason?.[0]}>
                <input name="reason" className={inputCls} placeholder="e.g. Out of stock, customer request" required />
              </FieldLabel>
              {paidOnline && <p className="text-sm text-amber-800">This order was paid online. Cancelling refunds the full amount to the customer.</p>}
              <div className="flex gap-2">
                <button type="submit" disabled={cancelling} className={btnDanger}>
                  {cancelling ? <Loader2 className="size-4 animate-spin" /> : <XCircle className="size-4" />} Confirm cancel
                </button>
                <button type="button" onClick={() => setConfirmCancel(false)} className={btnSecondary}>Keep order</button>
              </div>
            </form>
          ) : (
            <button type="button" onClick={() => setConfirmCancel(true)} className="text-sm font-medium text-red-700 underline-offset-4 hover:underline">
              Cancel order{paidOnline ? " and refund" : ""}
            </button>
          )}
          <div className="mt-3"><FormStatus state={cancelState} /></div>
        </div>
      )}
    </div>
  );
}

export function OrderNoteForm({ orderId }: { orderId: string }) {
  const [state, action, pending] = useActionState(addOrderNoteAction, idle);
  return (
    <form action={action} className="flex flex-col gap-2">
      <input type="hidden" name="orderId" value={orderId} />
      <label className="sr-only" htmlFor="note">Internal note</label>
      <textarea id="note" name="note" rows={2} maxLength={500} className={`${inputCls} h-auto py-2`} placeholder="Add a note for the team (not visible to the customer)" />
      <div className="flex items-center justify-between gap-3">
        <FormStatus state={state} />
        <button type="submit" disabled={pending} className={`${btnSecondary} ml-auto`}>{pending && <Loader2 className="size-4 animate-spin" />} Add note</button>
      </div>
    </form>
  );
}
