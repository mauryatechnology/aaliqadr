"use client";

import { useActionState, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { adjustStockAction, createCouponAction, setLowStockThresholdAction, setRoleAction, toggleCouponAction, updateCouponAction } from "@/actions/admin/store";
import type { FormState } from "@/actions/admin/shared";
import { btnPrimary, btnSecondary, FieldLabel, inputCls } from "./ui";
import { FormStatus } from "./FormStatus";
import { Drawer } from "./kit/Dialog";
import { toast } from "./kit/Toaster";

const idle: FormState = {};

export function StockAdjustForm({ productId, sku }: { productId: string; sku: string }) {
  const [state, action, pending] = useActionState(adjustStockAction, idle);
  return (
    <form action={action} className="flex flex-col gap-1.5">
      <input type="hidden" name="productId" value={productId} />
      <input type="hidden" name="sku" value={sku} />
      <div className="flex gap-2">
        <label className="sr-only" htmlFor={`d-${sku}`}>Change for {sku}</label>
        <input id={`d-${sku}`} name="delta" type="number" placeholder="+10 / -2" className={`${inputCls} !w-24 shrink-0`} required />
        <label className="sr-only" htmlFor={`r-${sku}`}>Reason</label>
        <input id={`r-${sku}`} name="reason" placeholder="Reason" className={`${inputCls} min-w-0 flex-1`} required />
        <button type="submit" disabled={pending} className={btnSecondary}>{pending ? <Loader2 className="size-4 animate-spin" /> : "Apply"}</button>
      </div>
      <FormStatus state={state} />
    </form>
  );
}

/**
 * Role change with an explicit confirmation (plan.md S9): nothing is submitted on select;
 * granting owner needs a second, typed confirmation.
 */
export function RoleSelect({ userId, role, disabled }: { userId: string; role: string; disabled: boolean }) {
  const [state, action, pending] = useActionState(setRoleAction, idle);
  const [next, setNext] = useState(role);
  const [typed, setTyped] = useState("");
  const changed = next !== role;
  const needsTyping = next === "owner";
  return (
    <form action={action} className="flex flex-col gap-1">
      <input type="hidden" name="userId" value={userId} />
      <div className="flex flex-wrap items-center gap-2">
        <label className="sr-only" htmlFor={`role-${userId}`}>Role</label>
        <select id={`role-${userId}`} name="role" value={next} disabled={disabled || pending} onChange={(e) => { setNext(e.target.value); setTyped(""); }} className={`${inputCls} h-9 w-32`}>
          <option value="customer">customer</option>
          <option value="staff">staff</option>
          <option value="admin">admin</option>
          <option value="owner">owner</option>
        </select>
        {changed && (
          <>
            {needsTyping && <input name="confirm" aria-label="Type OWNER to confirm" placeholder="Type OWNER" value={typed} onChange={(e) => setTyped(e.target.value)} className={`${inputCls} h-9 w-28`} />}
            <button type="submit" disabled={pending || (needsTyping && typed !== "OWNER")} className={`${btnPrimary} h-9 px-3`}>
              {pending ? <Loader2 className="size-4 animate-spin" /> : `Make ${next}`}
            </button>
            <button type="button" onClick={() => setNext(role)} className="text-xs text-neutral-600 hover:text-neutral-900">Cancel</button>
          </>
        )}
      </div>
      {changed && <p className="text-xs text-neutral-500">They&apos;ll be signed out so the new role applies at once.</p>}
      <FormStatus state={state} />
    </form>
  );
}

export interface CouponValue {
  code: string;
  description: string;
  kind: "percent" | "flat" | "free_shipping";
  value: number;
  maxDiscount: number;
  minSubtotal: number;
  startsAt: string;
  endsAt: string;
  usageLimit: number;
  perCustomerLimit: number;
  showOnProduct: boolean;
}

/** Create, or edit with `initial`. A used coupon keeps its code, type and value (plan.md §5). */
export function CouponForm({ initial, used = false, onDone }: { initial?: CouponValue; used?: boolean; onDone?: () => void }) {
  const [state, action, pending] = useActionState(initial ? updateCouponAction : createCouponAction, idle);
  const [kind, setKind] = useState<string>(initial?.kind ?? "percent");
  const fe = (k: string) => state.fieldErrors?.[k]?.[0];
  const [[today, in30]] = useState(() => {
    const now = new Date();
    // Calendar dates in India time: UTC dates are a day behind before 05:30 IST (plan.md B2).
    const ist = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(d);
    return [ist(now), ist(new Date(now.getTime() + 30 * 864e5))];
  });
  const [doneFor, setDoneFor] = useState(state);
  if (state !== doneFor) {
    setDoneFor(state);
    if (state.ok) onDone?.();
  }
  const locked = !!initial && used;
  return (
    <form action={action} className="grid grid-cols-1 gap-4 md:grid-cols-3">
      <FieldLabel label="Code" error={fe("code")} hint={initial ? "Codes can't change." : "Customers type this at checkout."}>
        <input name="code" className={`${inputCls} uppercase`} placeholder="STARS10" required defaultValue={initial?.code} readOnly={!!initial} />
      </FieldLabel>
      <FieldLabel label="Type" hint={locked ? "Fixed: this code has been used." : undefined}>
        {locked && <input type="hidden" name="kind" value={kind} />}
        <select name={locked ? undefined : "kind"} className={inputCls} value={kind} disabled={locked} onChange={(e) => setKind(e.target.value)}>
          <option value="percent">Percent off</option>
          <option value="flat">Flat ₹ off</option>
          <option value="free_shipping">Free shipping</option>
        </select>
      </FieldLabel>
      <FieldLabel label={kind === "percent" ? "Percent" : kind === "flat" ? "Amount ₹" : "Value"} error={fe("value")}>
        <input name="value" type="number" min={0} step="1" className={inputCls} readOnly={locked || kind === "free_shipping"} defaultValue={kind === "free_shipping" ? 0 : initial?.value} required={kind !== "free_shipping"} key={kind} />
      </FieldLabel>
      <FieldLabel label="Max discount ₹" hint="0 = no cap (percent codes)">
        <input name="maxDiscount" type="number" min={0} defaultValue={initial?.maxDiscount ?? 0} className={inputCls} />
      </FieldLabel>
      <FieldLabel label="Minimum order ₹">
        <input name="minSubtotal" type="number" min={0} defaultValue={initial?.minSubtotal ?? 0} className={inputCls} />
      </FieldLabel>
      <FieldLabel label="Description (internal)">
        <input name="description" className={inputCls} placeholder="Diwali campaign" defaultValue={initial?.description} />
      </FieldLabel>
      <FieldLabel label="Starts">
        <input name="startsAt" type="date" defaultValue={initial?.startsAt ?? today} className={inputCls} required />
      </FieldLabel>
      <FieldLabel label="Ends" error={fe("endsAt")}>
        <input name="endsAt" type="date" defaultValue={initial?.endsAt ?? in30} className={inputCls} required />
      </FieldLabel>
      <div className="grid grid-cols-2 gap-3">
        <FieldLabel label="Total uses" hint="0 = unlimited"><input name="usageLimit" type="number" min={0} defaultValue={initial?.usageLimit ?? 0} className={inputCls} /></FieldLabel>
        <FieldLabel label="Per customer"><input name="perCustomerLimit" type="number" min={0} defaultValue={initial?.perCustomerLimit ?? 1} className={inputCls} /></FieldLabel>
      </div>
      <label className="flex items-center gap-2 text-sm md:col-span-3">
        <input type="checkbox" name="showOnProduct" defaultChecked={initial?.showOnProduct} className="size-4" /> Advertise on product pages (offers row)
      </label>
      <div className="flex flex-wrap items-center gap-3 md:col-span-3">
        <button type="submit" disabled={pending} className={btnPrimary}>{pending && <Loader2 className="size-4 animate-spin" />} {initial ? "Save changes" : "Create coupon"}</button>
        <FormStatus state={state} />
      </div>
    </form>
  );
}

export function CouponToggle({ code, active }: { code: string; active: boolean }) {
  const [state, action, pending] = useActionState(toggleCouponAction, idle);
  return (
    <form action={action} className="flex items-center gap-2">
      <input type="hidden" name="code" value={code} />
      <input type="hidden" name="active" value={String(!active)} />
      <button type="submit" disabled={pending} className={`${btnSecondary} h-8 px-3 text-xs`}>{pending ? <Loader2 className="size-3.5 animate-spin" /> : active ? "Pause" : "Enable"}</button>
      {state.error && <span className="text-xs text-red-700">{state.error}</span>}
    </form>
  );
}

/** Inventory row action: the adjust form opens in a drawer, so the table stays light (bug B10). */
export function StockAdjustButton({ productId, sku, label, stock }: { productId: string; sku: string; label: string; stock: number }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="rounded-md border border-neutral-300 px-2.5 py-1 text-xs font-medium hover:bg-neutral-50">Adjust</button>
      <Drawer open={open} onClose={() => setOpen(false)} title={`Adjust ${sku}`}>
        <div className="flex flex-col gap-3 text-sm">
          <p className="text-neutral-600">{label}. Available now: <b className="tabular-nums">{stock}</b>. Use + for stock received, − for write-offs (damaged, lost, samples). Every change is recorded in the ledger.</p>
          <StockAdjustForm productId={productId} sku={sku} />
        </div>
      </Drawer>
    </>
  );
}

/** Click-to-edit "low stock at" with Undo (plan.md §4). */
export function ThresholdCell({ productId, sku, value }: { productId: string; sku: string; value: number }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [v, setV] = useState(String(value));
  const [pending, start] = useTransition();
  const save = (n: number, undo = false) =>
    start(async () => {
      const res = await setLowStockThresholdAction(productId, sku, n);
      if (res.error) return toast.error(res.error);
      setEditing(false);
      router.refresh();
      if (undo) toast.success("Restored.");
      else if (res.previous !== undefined && res.previous !== n) toast.success(res.message ?? "Saved.", { label: "Undo", run: () => save(res.previous!, true) });
    });
  if (!editing)
    return (
      <button type="button" onClick={() => { setV(String(value)); setEditing(true); }} className="rounded px-1 tabular-nums text-neutral-500 underline decoration-dotted underline-offset-4 hover:bg-neutral-100" title="Edit low-stock alert">
        {value}
      </button>
    );
  return (
    <form className="inline-flex items-center gap-1" onSubmit={(e) => { e.preventDefault(); save(Math.max(0, Math.round(Number(v)))); }}>
      <input autoFocus aria-label={`Low-stock alert for ${sku}`} type="number" min={0} max={1000} value={v} onChange={(e) => setV(e.target.value)} onKeyDown={(e) => e.key === "Escape" && setEditing(false)} className="h-7 w-16 rounded border border-neutral-300 px-1 text-right text-sm" />
      <button type="submit" disabled={pending} className="h-7 rounded bg-neutral-900 px-2 text-xs text-white">{pending ? <Loader2 className="size-3 animate-spin" /> : "OK"}</button>
    </form>
  );
}
