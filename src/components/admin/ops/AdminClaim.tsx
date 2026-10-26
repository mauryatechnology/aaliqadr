"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Loader2, Plus } from "lucide-react";
import { createClaimForCustomerAction, orderItemsForClaimAction } from "@/actions/admin/engagement";
import { routes } from "@/lib/routes";
import { btnPrimary, btnSecondary, FieldLabel, inputCls } from "../ui";
import { Drawer } from "../kit/Dialog";
import { toast } from "../kit/Toaster";

const REASONS = { damaged: "Arrived damaged", leaked: "Leaked in transit", wrong_item: "Wrong item sent", missing_item: "Item missing from the parcel", other: "Something else" } as const;

type OrderInfo = NonNullable<Awaited<ReturnType<typeof orderItemsForClaimAction>>>;

/** Opens a claim for a customer who reported a problem by phone or email (plan.md §5). */
export function AdminClaimButton({ orderId: fixedOrder }: { orderId?: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [orderId, setOrderId] = useState(fixedOrder ?? "");
  const [order, setOrder] = useState<OrderInfo | null>(null);
  const [qty, setQty] = useState<Record<string, number>>({});
  const [reason, setReason] = useState<keyof typeof REASONS>("damaged");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  const load = (id: string) =>
    start(async () => {
      setError("");
      const o = await orderItemsForClaimAction(id.trim().toUpperCase());
      setOrder(o);
      setQty({});
      if (!o) setError("No order with that number.");
    });

  function submit() {
    start(async () => {
      const items = Object.entries(qty).filter(([, n]) => n > 0).map(([sku, n]) => ({ sku, qty: n }));
      const res = await createClaimForCustomerAction({ orderId: orderId.trim().toUpperCase(), items, reason, description });
      if (res.error) return setError(res.error);
      toast.result(res);
      setOpen(false);
      if (res.id) router.push(routes.adminReturn(res.id));
    });
  }

  return (
    <>
      <button type="button" className={btnSecondary} onClick={() => { setOpen(true); if (fixedOrder && !order) load(fixedOrder); }}>
        <Plus className="size-4" /> Raise a claim
      </button>
      <Drawer
        open={open}
        onClose={() => setOpen(false)}
        title="Raise a claim for a customer"
        footer={
          <div className="flex justify-end gap-2">
            <button type="button" className={btnSecondary} onClick={() => setOpen(false)}>Cancel</button>
            <button type="button" className={btnPrimary} disabled={pending || !order} onClick={submit}>{pending && <Loader2 className="size-4 animate-spin" />} Open claim</button>
          </div>
        }
      >
        <div className="flex flex-col gap-4 text-sm">
          <p className="text-neutral-600">For problems reported by phone, email or WhatsApp. The customer is emailed and can follow it from their order page. The claim window and evidence rules don&apos;t apply.</p>
          <div className="flex items-end gap-2">
            <FieldLabel label="Order number" className="flex-1">
              <input className={inputCls} value={orderId} disabled={!!fixedOrder} onChange={(e) => { setOrderId(e.target.value); setOrder(null); }} placeholder="AQ-100123" />
            </FieldLabel>
            {!fixedOrder && <button type="button" className={btnSecondary} disabled={pending || !orderId} onClick={() => load(orderId)}>Find</button>}
          </div>
          {order && (
            <>
              <p>{order.name} · <span className="text-neutral-500">{order.status}</span></p>
              <fieldset className="flex flex-col gap-2">
                <legend className="mb-1 font-medium">Items affected</legend>
                {order.items.map((i) => (
                  <label key={i.sku} className="flex items-center justify-between gap-2">
                    <span>{i.label} <span className="text-xs text-neutral-500">(ordered {i.qty})</span></span>
                    <input type="number" min={0} max={i.qty} value={qty[i.sku] ?? 0} onChange={(e) => setQty({ ...qty, [i.sku]: Math.min(i.qty, Math.max(0, Number(e.target.value))) })} className={`${inputCls} w-20`} aria-label={`Quantity of ${i.label}`} />
                  </label>
                ))}
              </fieldset>
              <FieldLabel label="Reason">
                <select className={inputCls} value={reason} onChange={(e) => setReason(e.target.value as keyof typeof REASONS)}>
                  {Object.entries(REASONS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                </select>
              </FieldLabel>
              <FieldLabel label="What the customer reported">
                <textarea className={`${inputCls} h-auto py-2`} rows={4} value={description} onChange={(e) => setDescription(e.target.value)} maxLength={2000} />
              </FieldLabel>
            </>
          )}
          {error && <p role="alert" className="text-red-700">{error}</p>}
        </div>
      </Drawer>
    </>
  );
}
