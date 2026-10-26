"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Loader2, MapPin, Pencil, Plus, Star, Trash2 } from "lucide-react";
import { INDIAN_STATES } from "@/config/india";
import { stateFromPincode } from "@/lib/pincode";
import { cx } from "@/lib/cx";
import type { AddressDTO } from "@/server/services/addresses";

/**
 * Saved addresses with add / edit / delete / set default (plan.md §5, §11), used by the admin
 * customer page and the customer's own account. Actions come in bound to the person.
 */

type Result = { ok?: boolean; message?: string; error?: string };
type Form = Omit<AddressDTO, "id" | "isDefault" | "state">;
const BLANK: Form = { fullName: "", phone: "", line1: "", line2: "", landmark: "", city: "", stateCode: "07" as Form["stateCode"], pincode: "" };

const THEMES = {
  admin: {
    card: "rounded-lg border border-neutral-200 bg-white p-3",
    input: "h-10 w-full rounded-lg border border-neutral-300 bg-white px-3 text-sm text-neutral-900",
    primary: "inline-flex h-10 items-center gap-2 rounded-lg bg-neutral-900 px-4 text-sm font-medium text-white disabled:opacity-50",
    secondary: "inline-flex h-9 items-center gap-1.5 rounded-lg border border-neutral-300 bg-white px-3 text-sm hover:bg-neutral-50",
    muted: "text-neutral-500",
    error: "text-red-700",
  },
  store: {
    card: "surface p-4",
    input: "h-11 w-full rounded-lg border border-white/15 bg-white/5 px-3 text-sm text-fg placeholder:text-muted focus:border-gold focus:outline-none",
    primary: "btn-gold inline-flex h-11 items-center gap-2 rounded-full px-5 text-sm disabled:opacity-50",
    secondary: "inline-flex h-9 items-center gap-1.5 rounded-full border border-white/20 px-3 text-sm hover:border-gold",
    muted: "text-muted",
    error: "text-red-300",
  },
} as const;

export function AddressBook({
  addresses,
  save,
  remove,
  makeDefault,
  theme = "admin",
  max = 10,
  onResult,
}: {
  addresses: AddressDTO[];
  save: (input: Form, id?: string, makeDefault?: boolean) => Promise<Result>;
  remove: (id: string) => Promise<Result>;
  makeDefault: (id: string) => Promise<Result>;
  theme?: keyof typeof THEMES;
  max?: number;
  onResult?: (r: Result) => void;
}) {
  const t = THEMES[theme];
  const router = useRouter();
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const [form, setForm] = useState<Form>(BLANK);
  const [asDefault, setAsDefault] = useState(false);
  const [error, setError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const run = (fn: () => Promise<Result>, after?: () => void) =>
    start(async () => {
      const res = await fn();
      onResult?.(res);
      if (res.error) return setError(res.error);
      setError("");
      after?.();
      router.refresh();
    });

  function open(a?: AddressDTO) {
    setError("");
    setAsDefault(false);
    setForm(a ? { fullName: a.fullName, phone: a.phone, line1: a.line1, line2: a.line2, landmark: a.landmark, city: a.city, stateCode: a.stateCode, pincode: a.pincode } : BLANK);
    setEditing(a?.id ?? "new");
  }

  const field = (k: keyof Form, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <label className="flex flex-col gap-1 text-sm">
      <span className={t.muted}>{label}</span>
      <input className={t.input} value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} {...props} />
    </label>
  );

  return (
    <div className="flex flex-col gap-3">
      {addresses.length === 0 && editing === null && <p className={cx("text-sm", t.muted)}>No saved addresses yet.</p>}
      <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {addresses.map((a) => (
          <li key={a.id} className={cx(t.card, "flex flex-col gap-2 text-sm")}>
            <p className="flex items-center gap-2 font-medium">
              <MapPin className="size-4 shrink-0" aria-hidden /> {a.fullName}
              {a.isDefault && <span className="rounded-full bg-gold/20 px-2 py-0.5 text-[11px] uppercase tracking-wide">Default</span>}
            </p>
            <p className={t.muted}>
              {a.line1}
              {a.line2 ? `, ${a.line2}` : ""}
              {a.landmark ? ` (${a.landmark})` : ""}
              <br />
              {a.city}, {a.state} {a.pincode} · {a.phone}
            </p>
            <div className="flex flex-wrap gap-2">
              <button type="button" className={t.secondary} onClick={() => open(a)}><Pencil className="size-3.5" /> Edit</button>
              {!a.isDefault && <button type="button" className={t.secondary} disabled={pending} onClick={() => run(() => makeDefault(a.id))}><Star className="size-3.5" /> Make default</button>}
              {confirmDelete === a.id ? (
                <span className="inline-flex items-center gap-2">
                  Delete?
                  <button type="button" className={cx(t.secondary, "text-red-600")} disabled={pending} onClick={() => run(() => remove(a.id), () => setConfirmDelete(null))}>Yes</button>
                  <button type="button" className={t.secondary} onClick={() => setConfirmDelete(null)}>No</button>
                </span>
              ) : (
                <button type="button" className={t.secondary} onClick={() => setConfirmDelete(a.id)} aria-label={`Delete address ${a.line1}`}><Trash2 className="size-3.5" /></button>
              )}
            </div>
          </li>
        ))}
      </ul>

      {editing !== null ? (
        <form
          className={cx(t.card, "grid grid-cols-1 gap-3 sm:grid-cols-2")}
          onSubmit={(e) => {
            e.preventDefault();
            run(() => save(form, editing === "new" ? undefined : editing, asDefault), () => setEditing(null));
          }}
        >
          <p className="font-medium sm:col-span-2">{editing === "new" ? "New address" : "Edit address"}</p>
          {field("fullName", "Recipient's name", { autoComplete: "name", required: true })}
          {field("phone", "Mobile number", { inputMode: "tel", autoComplete: "tel", required: true })}
          <div className="sm:col-span-2">{field("line1", "House / flat, street", { autoComplete: "address-line1", required: true })}</div>
          {field("line2", "Area / locality (optional)", { autoComplete: "address-line2" })}
          {field("landmark", "Landmark (optional)")}
          <label className="flex flex-col gap-1 text-sm">
            <span className={t.muted}>PIN code</span>
            <input
              className={t.input}
              inputMode="numeric"
              maxLength={6}
              autoComplete="postal-code"
              required
              value={form.pincode}
              onChange={(e) => {
                const pincode = e.target.value.replace(/\D/g, "");
                const guess = stateFromPincode(pincode);
                setForm({ ...form, pincode, ...(guess ? { stateCode: guess as Form["stateCode"] } : {}) });
              }}
            />
          </label>
          {field("city", "City", { autoComplete: "address-level2", required: true })}
          <label className="flex flex-col gap-1 text-sm sm:col-span-2">
            <span className={t.muted}>State</span>
            <select className={t.input} value={form.stateCode} onChange={(e) => setForm({ ...form, stateCode: e.target.value as Form["stateCode"] })}>
              {INDIAN_STATES.map((s) => <option key={s.code} value={s.code}>{s.name}</option>)}
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <input type="checkbox" className="size-4" checked={asDefault} onChange={(e) => setAsDefault(e.target.checked)} /> Use as the default address
          </label>
          {error && <p role="alert" className={cx("text-sm sm:col-span-2", t.error)}>{error}</p>}
          <div className="flex gap-2 sm:col-span-2">
            <button type="submit" className={t.primary} disabled={pending}>{pending && <Loader2 className="size-4 animate-spin" />} Save address</button>
            <button type="button" className={t.secondary} onClick={() => setEditing(null)}>Cancel</button>
          </div>
        </form>
      ) : (
        addresses.length < max && (
          <button type="button" className={cx(t.secondary, "self-start")} onClick={() => open()}><Plus className="size-4" /> Add an address</button>
        )
      )}
      {error && editing === null && <p role="alert" className={cx("text-sm", t.error)}>{error}</p>}
    </div>
  );
}
