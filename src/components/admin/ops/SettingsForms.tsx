"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { inviteStaffAction, revokeInviteAction, saveBusinessAction, saveShippingAction, saveStoreSettingsAction } from "@/actions/admin/engagement";
import { INDIAN_STATES } from "@/config/india";
import type { FormState } from "@/actions/admin/shared";
import { formatPrice } from "@/lib/money";
import { cn } from "@/lib/cn";
import { btnPrimary, btnSecondary, Card, FieldLabel, inputCls } from "../ui";
import { FormStatus } from "../FormStatus";
import { ConfirmButton, Switch } from "../widgets";

export interface ShippingValues {
  freeShippingAbove: number;
  slabs: { uptoG: number; price: number }[];
  extraPer500g: number;
  codEnabled: boolean;
  codMaxOrder: number;
  codFee: number;
  delivery: Record<"dispatch" | "local" | "metro" | "rest" | "remote", [number, number]>;
}

/** Weight slabs, free-shipping threshold and COD rules, with a live quote preview. */
export function ShippingForm({ initial }: { initial: ShippingValues }) {
  const router = useRouter();
  const [v, setV] = useState(initial);
  const [state, setState] = useState<FormState>({});
  const [pending, start] = useTransition();
  const [testG, setTestG] = useState(400);
  const [testOrder, setTestOrder] = useState(999);
  const num = (s: string) => (s === "" ? 0 : Number(s));

  const quote = (() => {
    if (testOrder >= v.freeShippingAbove) return 0;
    const slab = v.slabs.find((s) => testG <= s.uptoG);
    if (slab) return slab.price;
    const last = v.slabs.at(-1);
    return last ? last.price + Math.ceil((testG - last.uptoG) / 500) * v.extraPer500g : 0;
  })();

  return (
    <div className="flex flex-col gap-6">
      <Card title="Delivery charges">
        <div className="flex flex-col gap-4">
          <FieldLabel label="Free shipping on orders from ₹" className="max-w-xs"><input type="number" min={0} className={inputCls} value={v.freeShippingAbove} onChange={(e) => setV({ ...v, freeShippingAbove: num(e.target.value) })} /></FieldLabel>
          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium">Weight slabs <span className="font-normal text-neutral-500">(parcel weight, lightest first)</span></span>
            {v.slabs.map((s, i) => (
              <div key={i} className="flex flex-wrap items-center gap-2 text-sm">
                <span className="w-16 text-neutral-600">Up to</span>
                <input aria-label="Up to grams" type="number" min={1} className={`${inputCls} w-28`} value={s.uptoG} onChange={(e) => setV({ ...v, slabs: v.slabs.map((x, j) => (j === i ? { ...x, uptoG: num(e.target.value) } : x)) })} /> g
                <span className="ml-3 text-neutral-600">charge ₹</span>
                <input aria-label="Charge" type="number" min={0} className={`${inputCls} w-28`} value={s.price} onChange={(e) => setV({ ...v, slabs: v.slabs.map((x, j) => (j === i ? { ...x, price: num(e.target.value) } : x)) })} />
                {v.slabs.length > 1 && <button type="button" aria-label="Remove slab" onClick={() => setV({ ...v, slabs: v.slabs.filter((_, j) => j !== i) })} className="rounded p-2 text-neutral-500 hover:bg-red-50 hover:text-red-700"><Trash2 className="size-4" /></button>}
              </div>
            ))}
            {v.slabs.length < 8 && <button type="button" className={cn(btnSecondary, "self-start")} onClick={() => setV({ ...v, slabs: [...v.slabs, { uptoG: (v.slabs.at(-1)?.uptoG ?? 0) + 500, price: v.slabs.at(-1)?.price ?? 0 }] })}><Plus className="size-4" /> Add slab</button>}
          </div>
          <FieldLabel label="Each extra 500 g beyond the last slab ₹" className="max-w-xs"><input type="number" min={0} className={inputCls} value={v.extraPer500g} onChange={(e) => setV({ ...v, extraPer500g: num(e.target.value) })} /></FieldLabel>
          <div className="flex flex-wrap items-end gap-3 rounded-lg bg-neutral-50 p-3 text-sm">
            <span className="w-full text-xs font-medium text-neutral-600">Try it</span>
            <label className="flex flex-col gap-1 text-xs">Parcel g<input type="number" className={`${inputCls} w-24`} value={testG} onChange={(e) => setTestG(num(e.target.value))} /></label>
            <label className="flex flex-col gap-1 text-xs">Order ₹<input type="number" className={`${inputCls} w-28`} value={testOrder} onChange={(e) => setTestOrder(num(e.target.value))} /></label>
            <p className="pb-2">Shipping: <strong>{quote === 0 ? "Free" : formatPrice(Math.round(quote * 100))}</strong></p>
          </div>
        </div>
      </Card>
      <Card title="Delivery estimates (product page)">
        <p className="mb-3 text-sm text-neutral-600">Working days shown to shoppers who enter their PIN code. Local = your registered state; metro = the big cities; remote = north-east, hills and islands.</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {(["dispatch", "local", "metro", "rest", "remote"] as const).map((k) => (
            <FieldLabel key={k} label={k === "dispatch" ? "To dispatch" : k === "rest" ? "Rest of India" : k[0]!.toUpperCase() + k.slice(1)}>
              <span className="flex items-center gap-1">
                <input aria-label={`${k} shortest`} type="number" min={0} max={30} className={`${inputCls} w-16`} value={v.delivery[k][0]} onChange={(e) => setV({ ...v, delivery: { ...v.delivery, [k]: [num(e.target.value), v.delivery[k][1]] } })} />
                –
                <input aria-label={`${k} longest`} type="number" min={0} max={30} className={`${inputCls} w-16`} value={v.delivery[k][1]} onChange={(e) => setV({ ...v, delivery: { ...v.delivery, [k]: [v.delivery[k][0], num(e.target.value)] } })} />
              </span>
            </FieldLabel>
          ))}
        </div>
      </Card>
      <Card title="Cash on delivery">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Switch checked={v.codEnabled} onChange={(codEnabled) => setV({ ...v, codEnabled })} label="Offer cash on delivery" hint="Each variant can also switch COD off." />
          <FieldLabel label="Largest COD order ₹"><input type="number" min={0} className={inputCls} value={v.codMaxOrder} onChange={(e) => setV({ ...v, codMaxOrder: num(e.target.value) })} /></FieldLabel>
          <FieldLabel label="COD fee ₹"><input type="number" min={0} className={inputCls} value={v.codFee} onChange={(e) => setV({ ...v, codFee: num(e.target.value) })} /></FieldLabel>
        </div>
      </Card>
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" className={btnPrimary} disabled={pending} onClick={() => start(async () => { const res = await saveShippingAction(v); setState(res); if (res.ok) router.refresh(); })}>{pending && <Loader2 className="size-4 animate-spin" />} Save shipping</button>
        <FormStatus state={state} />
      </div>
    </div>
  );
}

export function StoreSettingsForm({ initial }: { initial: { giftWrap: number; reservationMinutes: number; returnWindowHours: number; qaEnabled: boolean } }) {
  const router = useRouter();
  const [v, setV] = useState(initial);
  const [state, setState] = useState<FormState>({});
  const [pending, start] = useTransition();
  return (
    <Card title="Checkout & after-sales">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <FieldLabel label="Gift wrap ₹"><input type="number" min={0} className={inputCls} value={v.giftWrap} onChange={(e) => setV({ ...v, giftWrap: Number(e.target.value) })} /></FieldLabel>
        <FieldLabel label="Hold unpaid orders (minutes)" hint="Stock is reserved this long while customers pay (15–120)."><input type="number" min={15} max={120} className={inputCls} value={v.reservationMinutes} onChange={(e) => setV({ ...v, reservationMinutes: Number(e.target.value) })} /></FieldLabel>
        <FieldLabel label="Claim window (hours after delivery)" hint="How long customers can report damage, leaks or a wrong item."><input type="number" min={24} max={720} className={inputCls} value={v.returnWindowHours} onChange={(e) => setV({ ...v, returnWindowHours: Number(e.target.value) })} /></FieldLabel>
        <div className="md:col-span-3"><Switch checked={v.qaEnabled} onChange={(qaEnabled) => setV({ ...v, qaEnabled })} label="Questions & answers on product pages" hint="Customers ask; you answer in Reviews › Questions before anything is shown." /></div>
      </div>
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button type="button" className={btnPrimary} disabled={pending} onClick={() => start(async () => { const res = await saveStoreSettingsAction(v); setState(res); if (res.ok) router.refresh(); })}>{pending && <Loader2 className="size-4 animate-spin" />} Save</button>
        <FormStatus state={state} />
      </div>
    </Card>
  );
}

export function InviteStaff({ invites }: { invites: { id: string; email: string; role: string; invitedBy: string; acceptedAt?: string; createdAt?: string }[] }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"staff" | "admin">("staff");
  const [state, setState] = useState<FormState>({});
  const [pending, start] = useTransition();
  return (
    <Card title="Invite a team member">
      <form
        className="flex flex-wrap items-end gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          start(async () => { const res = await inviteStaffAction({ email, role }); setState(res); if (res.ok) { setEmail(""); router.refresh(); } });
        }}
      >
        <FieldLabel label="Email" className="min-w-64 flex-1"><input type="email" required className={inputCls} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" /></FieldLabel>
        <FieldLabel label="Role">
          <select className={inputCls} value={role} onChange={(e) => setRole(e.target.value as "staff" | "admin")}>
            <option value="staff">Staff: orders, inventory, reviews</option>
            <option value="admin">Admin: everything except roles</option>
          </select>
        </FieldLabel>
        <button type="submit" className={btnPrimary} disabled={pending}>{pending && <Loader2 className="size-4 animate-spin" />} Invite</button>
      </form>
      <div className="mt-3"><FormStatus state={state} /></div>
      {invites.length > 0 && (
        <ul className="mt-4 flex flex-col divide-y divide-neutral-100 text-sm">
          {invites.map((i) => (
            <li key={i.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
              <span>{i.email} · {i.role} <span className="text-xs text-neutral-500">{i.acceptedAt ? "joined" : `invited by ${i.invitedBy}, waiting for first sign-in`}</span></span>
              {!i.acceptedAt && <ConfirmButton className="text-sm text-neutral-600 hover:text-red-700" confirm={`Withdraw ${i.email}'s invite?`} action={() => revokeInviteAction(i.id)} onDone={() => router.refresh()}>Withdraw</ConfirmButton>}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

export interface BusinessValue {
  legalName: string;
  address: string;
  city: string;
  stateCode: string;
  gstin: string;
  supportPhone: string;
  supportEmail: string;
}

/** Owner-only seller details (plan.md §5). */
export function BusinessForm({ initial }: { initial: BusinessValue }) {
  const [v, setV] = useState(initial);
  const [state, setState] = useState<FormState>({});
  const [pending, start] = useTransition();
  const f = (k: keyof BusinessValue, label: string, hint?: string, wide = false) => (
    <FieldLabel label={label} hint={hint} className={wide ? "md:col-span-2" : undefined}>
      <input className={inputCls} value={v[k]} onChange={(e) => setV({ ...v, [k]: e.target.value })} />
    </FieldLabel>
  );
  return (
    <Card title="Business details (printed on invoices)">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {f("legalName", "Registered business name", undefined, true)}
        {f("address", "Registered address", "As on your GST certificate.", true)}
        {f("city", "City")}
        <FieldLabel label="State of registration" hint="Decides CGST + SGST vs IGST on every order.">
          <select className={inputCls} value={v.stateCode} onChange={(e) => setV({ ...v, stateCode: e.target.value })}>
            {INDIAN_STATES.map((s) => <option key={s.code} value={s.code}>{s.name}</option>)}
          </select>
        </FieldLabel>
        {f("gstin", "GSTIN", "Leave empty until registered.")}
        {f("supportPhone", "Support phone")}
        {f("supportEmail", "Support email (optional)")}
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button type="button" className={btnPrimary} disabled={pending} onClick={() => start(async () => setState(await saveBusinessAction(v)))}>{pending && <Loader2 className="size-4 animate-spin" />} Save business details</button>
        <FormStatus state={state} />
      </div>
      <p className="mt-2 text-xs text-neutral-500">Invoices already issued keep the details printed on them.</p>
    </Card>
  );
}
