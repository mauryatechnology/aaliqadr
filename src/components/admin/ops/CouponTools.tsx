"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { List, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { couponUsageAction, deleteCouponAction } from "@/actions/admin/store";
import { formatPrice } from "@/lib/money";
import { routes } from "@/lib/routes";
import Link from "next/link";
import { btnPrimary } from "../ui";
import { CouponForm, type CouponValue } from "../AdminForms";
import { ConfirmDialog, Drawer } from "../kit/Dialog";
import { toast } from "../kit/Toaster";

/** Coupon create / edit / delete / usage, each in a drawer (plan.md §5). */

export function NewCouponButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className={btnPrimary} onClick={() => setOpen(true)}><Plus className="size-4" /> New coupon</button>
      <Drawer open={open} onClose={() => setOpen(false)} title="New coupon" wide>
        <CouponForm onDone={() => { setOpen(false); router.refresh(); }} />
      </Drawer>
    </>
  );
}

const icon = "rounded p-1.5 text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900";

export function CouponRowActions({ coupon, used }: { coupon: CouponValue; used: boolean }) {
  const router = useRouter();
  const [mode, setMode] = useState<null | "edit" | "usage" | "delete">(null);
  const [usage, setUsage] = useState<Awaited<ReturnType<typeof couponUsageAction>> | null>(null);
  const [pending, start] = useTransition();
  return (
    <span className="inline-flex items-center gap-0.5">
      <button type="button" className={icon} title="Edit" aria-label={`Edit ${coupon.code}`} onClick={() => setMode("edit")}><Pencil className="size-4" /></button>
      <button type="button" className={icon} title="Orders that used it" aria-label={`Usage of ${coupon.code}`} onClick={() => { setMode("usage"); start(async () => setUsage(await couponUsageAction(coupon.code))); }}><List className="size-4" /></button>
      {!used && <button type="button" className={icon} title="Delete" aria-label={`Delete ${coupon.code}`} onClick={() => setMode("delete")}><Trash2 className="size-4" /></button>}
      <Drawer open={mode === "edit"} onClose={() => setMode(null)} title={`Edit ${coupon.code}`} wide>
        <CouponForm initial={coupon} used={used} onDone={() => { setMode(null); router.refresh(); }} />
      </Drawer>
      <Drawer open={mode === "usage"} onClose={() => setMode(null)} title={`${coupon.code} usage`}>
        {pending || !usage ? (
          <p className="flex items-center gap-2 text-sm text-neutral-500"><Loader2 className="size-4 animate-spin" /> Loading…</p>
        ) : usage.length === 0 ? (
          <p className="text-sm text-neutral-600">Not used yet.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-neutral-100 text-sm">
            {usage.map((u) => (
              <li key={u.orderId} className="flex items-center justify-between gap-2 py-2">
                <span><Link href={routes.adminOrder(u.orderId)} className="font-medium hover:underline">{u.orderId}</Link><span className="block text-xs text-neutral-500">{u.email} · {u.status}</span></span>
                <span className="tabular-nums">−{formatPrice(u.discountP)}</span>
              </li>
            ))}
          </ul>
        )}
      </Drawer>
      <ConfirmDialog
        open={mode === "delete"}
        title={`Delete ${coupon.code}?`}
        confirmLabel="Delete"
        pending={pending}
        onCancel={() => setMode(null)}
        onConfirm={() =>
          start(async () => {
            const res = await deleteCouponAction(coupon.code);
            toast.result(res);
            setMode(null);
            router.refresh();
          })
        }
      >
        It has never been used, so it can be removed completely.
      </ConfirmDialog>
    </span>
  );
}
