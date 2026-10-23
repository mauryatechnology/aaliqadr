"use client";

import { useActionState, useState } from "react";
import { Loader2 } from "lucide-react";
import { adjustStockAction, createCouponAction, saveSettingsAction, setRoleAction, toggleCouponAction } from "@/actions/admin/store";
import type { FormState } from "@/actions/admin/shared";
import { btnPrimary, btnSecondary, FieldLabel, inputCls } from "./ui";
import { FormStatus } from "./FormStatus";

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

export function RoleSelect({ userId, role, disabled }: { userId: string; role: string; disabled: boolean }) {
  const [state, action, pending] = useActionState(setRoleAction, idle);
  return (
    <form action={action} className="flex flex-col gap-1">
      <input type="hidden" name="userId" value={userId} />
      <div className="flex items-center gap-2">
        <label className="sr-only" htmlFor={`role-${userId}`}>Role</label>
        <select id={`role-${userId}`} name="role" defaultValue={role} disabled={disabled || pending} onChange={(e) => e.currentTarget.form?.requestSubmit()} className={`${inputCls} h-9 w-32`}>
          <option value="customer">customer</option>
          <option value="staff">staff</option>
          <option value="admin">admin</option>
          <option value="owner">owner</option>
        </select>
        {pending && <Loader2 className="size-4 animate-spin text-neutral-500" />}
      </div>
      <FormStatus state={state} />
    </form>
  );
}

export function CouponForm() {
  const [state, action, pending] = useActionState(createCouponAction, idle);
  const [kind, setKind] = useState("percent");
  const fe = (k: string) => state.fieldErrors?.[k]?.[0];
  const [[today, in30]] = useState(() => {
    const now = new Date();
    return [now.toISOString().slice(0, 10), new Date(now.getTime() + 30 * 864e5).toISOString().slice(0, 10)];
  });
  return (
    <form action={action} className="grid grid-cols-1 gap-4 md:grid-cols-3">
      <FieldLabel label="Code" error={fe("code")} hint="Customers type this at checkout.">
        <input name="code" className={`${inputCls} uppercase`} placeholder="STARS10" required />
      </FieldLabel>
      <FieldLabel label="Type">
        <select name="kind" className={inputCls} value={kind} onChange={(e) => setKind(e.target.value)}>
          <option value="percent">Percent off</option>
          <option value="flat">Flat ₹ off</option>
          <option value="free_shipping">Free shipping</option>
        </select>
      </FieldLabel>
      <FieldLabel label={kind === "percent" ? "Percent" : kind === "flat" ? "Amount ₹" : "Value"} error={fe("value")}>
        <input name="value" type="number" min={0} step="1" className={inputCls} disabled={kind === "free_shipping"} defaultValue={kind === "free_shipping" ? 0 : undefined} required={kind !== "free_shipping"} />
      </FieldLabel>
      {kind === "free_shipping" && <input type="hidden" name="value" value="0" />}
      <FieldLabel label="Max discount ₹" hint="0 = no cap (percent codes)">
        <input name="maxDiscount" type="number" min={0} defaultValue={0} className={inputCls} />
      </FieldLabel>
      <FieldLabel label="Minimum order ₹">
        <input name="minSubtotal" type="number" min={0} defaultValue={0} className={inputCls} />
      </FieldLabel>
      <FieldLabel label="Description (internal)">
        <input name="description" className={inputCls} placeholder="Diwali campaign" />
      </FieldLabel>
      <FieldLabel label="Starts">
        <input name="startsAt" type="date" defaultValue={today} className={inputCls} required />
      </FieldLabel>
      <FieldLabel label="Ends" error={fe("endsAt")}>
        <input name="endsAt" type="date" defaultValue={in30} className={inputCls} required />
      </FieldLabel>
      <div className="grid grid-cols-2 gap-3">
        <FieldLabel label="Total uses" hint="0 = unlimited"><input name="usageLimit" type="number" min={0} defaultValue={0} className={inputCls} /></FieldLabel>
        <FieldLabel label="Per customer"><input name="perCustomerLimit" type="number" min={0} defaultValue={1} className={inputCls} /></FieldLabel>
      </div>
      <div className="flex flex-wrap items-center gap-3 md:col-span-3">
        <button type="submit" disabled={pending} className={btnPrimary}>{pending && <Loader2 className="size-4 animate-spin" />} Create coupon</button>
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

export interface SettingsValues {
  freeShippingAbove: number;
  slab1UptoG: number;
  slab1Price: number;
  slab2UptoG: number;
  slab2Price: number;
  extraPer500g: number;
  codEnabled: boolean;
  codMaxOrder: number;
  codFee: number;
  giftWrap: number;
  reservationMinutes: number;
}

export function SettingsForm({ values }: { values: SettingsValues }) {
  const [state, action, pending] = useActionState(saveSettingsAction, idle);
  const fe = (k: string) => state.fieldErrors?.[k]?.[0];
  return (
    <form action={action} className="flex flex-col gap-6">
      <fieldset className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <legend className="mb-2 text-sm font-semibold">Shipping</legend>
        <FieldLabel label="Free shipping above ₹"><input name="freeShippingAbove" type="number" min={0} defaultValue={values.freeShippingAbove} className={inputCls} /></FieldLabel>
        <FieldLabel label="Up to (grams)"><input name="slab1UptoG" type="number" min={1} defaultValue={values.slab1UptoG} className={inputCls} /></FieldLabel>
        <FieldLabel label="Charge ₹"><input name="slab1Price" type="number" min={0} defaultValue={values.slab1Price} className={inputCls} /></FieldLabel>
        <div className="hidden md:block" />
        <FieldLabel label="Then up to (grams)" error={fe("slab2UptoG")}><input name="slab2UptoG" type="number" min={1} defaultValue={values.slab2UptoG} className={inputCls} /></FieldLabel>
        <FieldLabel label="Charge ₹"><input name="slab2Price" type="number" min={0} defaultValue={values.slab2Price} className={inputCls} /></FieldLabel>
        <div className="hidden md:block" />
        <FieldLabel label="Each extra 500 g ₹" className="md:col-span-2"><input name="extraPer500g" type="number" min={0} defaultValue={values.extraPer500g} className={inputCls} /></FieldLabel>
      </fieldset>
      <fieldset className="grid grid-cols-1 gap-4 border-t border-neutral-200 pt-5 md:grid-cols-3">
        <legend className="mb-2 pt-5 text-sm font-semibold">Cash on delivery</legend>
        <label className="flex items-center gap-2 text-sm md:col-span-3"><input type="checkbox" name="codEnabled" defaultChecked={values.codEnabled} className="size-4" /> Offer cash on delivery</label>
        <FieldLabel label="Max COD order ₹"><input name="codMaxOrder" type="number" min={0} defaultValue={values.codMaxOrder} className={inputCls} /></FieldLabel>
        <FieldLabel label="COD fee ₹"><input name="codFee" type="number" min={0} defaultValue={values.codFee} className={inputCls} /></FieldLabel>
      </fieldset>
      <fieldset className="grid grid-cols-1 gap-4 border-t border-neutral-200 pt-5 md:grid-cols-3">
        <legend className="mb-2 pt-5 text-sm font-semibold">Checkout</legend>
        <FieldLabel label="Gift wrap ₹"><input name="giftWrap" type="number" min={0} defaultValue={values.giftWrap} className={inputCls} /></FieldLabel>
        <FieldLabel label="Hold unpaid orders (minutes)" hint="Stock is reserved this long while customers pay." error={fe("reservationMinutes")}><input name="reservationMinutes" type="number" min={15} max={120} defaultValue={values.reservationMinutes} className={inputCls} /></FieldLabel>
      </fieldset>
      <div className="flex flex-wrap items-center gap-3 border-t border-neutral-200 pt-5">
        <button type="submit" disabled={pending} className={btnPrimary}>{pending && <Loader2 className="size-4 animate-spin" />} Save settings</button>
        <FormStatus state={state} />
      </div>
    </form>
  );
}
