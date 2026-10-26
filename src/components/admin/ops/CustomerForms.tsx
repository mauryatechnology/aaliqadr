"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Ban, Loader2, Pencil, UserPlus } from "lucide-react";
import { createCustomerAction, setCustomerFlagsAction, updateCustomerAction } from "@/actions/admin/customers";
import { routes } from "@/lib/routes";
import { btnPrimary, btnSecondary, FieldLabel, inputCls } from "../ui";
import { ConfirmDialog, Drawer } from "../kit/Dialog";
import { toast } from "../kit/Toaster";

/** Customer create / edit / deactivate / COD block (plan.md §5). */

export function NewCustomerButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [v, setV] = useState({ name: "", email: "", phone: "" });
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  return (
    <>
      <button type="button" className={btnSecondary} onClick={() => setOpen(true)}><UserPlus className="size-4" /> Add customer</button>
      <Drawer
        open={open}
        onClose={() => setOpen(false)}
        title="Add a customer"
        footer={
          <div className="flex justify-end gap-2">
            <button type="button" className={btnSecondary} onClick={() => setOpen(false)}>Cancel</button>
            <button
              type="button"
              className={btnPrimary}
              disabled={pending}
              onClick={() =>
                start(async () => {
                  const res = await createCustomerAction(v);
                  if (res.error) return setError(res.error);
                  toast.result(res);
                  setOpen(false);
                  if (res.id) router.push(routes.adminCustomer(res.id));
                })
              }
            >
              {pending && <Loader2 className="size-4 animate-spin" />} Add customer
            </button>
          </div>
        }
      >
        <div className="flex flex-col gap-3">
          <p className="text-sm text-neutral-600">For orders taken by phone or WhatsApp. No password is set: the customer signs in with a code sent to this email.</p>
          <FieldLabel label="Name"><input className={inputCls} value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} /></FieldLabel>
          <FieldLabel label="Email"><input type="email" className={inputCls} value={v.email} onChange={(e) => setV({ ...v, email: e.target.value })} /></FieldLabel>
          <FieldLabel label="Mobile (optional)"><input inputMode="tel" className={inputCls} value={v.phone} onChange={(e) => setV({ ...v, phone: e.target.value })} /></FieldLabel>
          {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
        </div>
      </Drawer>
    </>
  );
}

export function CustomerProfileCard({ id, name, phone, disabled, codBlocked, isStaff }: { id: string; name: string; phone?: string; disabled: boolean; codBlocked: boolean; isStaff: boolean }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [v, setV] = useState({ name, phone: phone ?? "" });
  const [error, setError] = useState("");
  const [confirm, setConfirm] = useState<null | "disable">(null);
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<{ ok?: boolean; error?: string; message?: string }>, after?: () => void) =>
    start(async () => {
      const res = await fn();
      toast.result(res);
      if (res.error) return setError(res.error);
      setError("");
      after?.();
      router.refresh();
    });

  return (
    <div className="flex flex-col gap-3 text-sm">
      {editing ? (
        <div className="flex flex-col gap-2">
          <FieldLabel label="Name"><input className={inputCls} value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} /></FieldLabel>
          <FieldLabel label="Mobile"><input className={inputCls} inputMode="tel" value={v.phone} onChange={(e) => setV({ ...v, phone: e.target.value })} /></FieldLabel>
          <div className="flex gap-2">
            <button type="button" className={btnPrimary} disabled={pending} onClick={() => run(() => updateCustomerAction(id, v), () => setEditing(false))}>Save</button>
            <button type="button" className={btnSecondary} onClick={() => setEditing(false)}>Cancel</button>
          </div>
        </div>
      ) : (
        <button type="button" className={`${btnSecondary} self-start`} onClick={() => setEditing(true)}><Pencil className="size-4" /> Edit name & phone</button>
      )}
      <label className="flex items-center justify-between gap-3">
        <span>
          Block cash on delivery
          <span className="block text-xs text-neutral-500">Checkout offers prepaid only (e.g. after refused COD parcels).</span>
        </span>
        <input type="checkbox" className="size-4" checked={codBlocked} disabled={pending} onChange={(e) => run(() => setCustomerFlagsAction(id, { codBlocked: e.target.checked }))} />
      </label>
      {!isStaff &&
        (disabled ? (
          <button type="button" className={`${btnSecondary} self-start`} disabled={pending} onClick={() => run(() => setCustomerFlagsAction(id, { disabled: false }))}>Reactivate account</button>
        ) : (
          <button type="button" className={`${btnSecondary} self-start text-red-700`} onClick={() => setConfirm("disable")}><Ban className="size-4" /> Deactivate account</button>
        ))}
      {error && <p role="alert" className="text-red-700">{error}</p>}
      <ConfirmDialog
        open={confirm === "disable"}
        title="Deactivate this account?"
        confirmLabel="Deactivate"
        pending={pending}
        onCancel={() => setConfirm(null)}
        onConfirm={() => run(() => setCustomerFlagsAction(id, { disabled: true }), () => setConfirm(null))}
      >
        They&apos;re signed out everywhere and can&apos;t sign in again until reactivated. Their orders and data are kept. To erase personal data, use a privacy request instead.
      </ConfirmDialog>
    </div>
  );
}
