"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, X } from "lucide-react";
import { cx } from "@/lib/cx";

/**
 * Native `<dialog>` overlays (plan.md §2.4): focus trap, Esc and backdrop for free.
 * `ConfirmDialog` asks before destructive or money actions; `Drawer` is a right-side panel.
 */

function useModal(open: boolean, onClose: () => void) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    const cancel = (e: Event) => {
      e.preventDefault();
      onClose();
    };
    d.addEventListener("cancel", cancel);
    return () => d.removeEventListener("cancel", cancel);
  }, [onClose]);
  return ref;
}

const btn = "inline-flex h-9 items-center justify-center gap-2 rounded-lg px-4 text-sm font-medium disabled:opacity-50";

export function ConfirmDialog({
  open,
  title,
  children,
  confirmLabel = "Confirm",
  danger = true,
  typeToConfirm,
  pending = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  children?: React.ReactNode;
  confirmLabel?: string;
  danger?: boolean;
  /** The person must type this (e.g. a count, or OWNER) before confirming. */
  typeToConfirm?: string;
  pending?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const ref = useModal(open, onCancel);
  const [typed, setTyped] = useState("");
  const ready = !typeToConfirm || typed.trim() === typeToConfirm;
  return (
    <dialog
      ref={ref}
      aria-labelledby="confirm-title"
      onClick={(e) => e.target === ref.current && onCancel()}
      className="m-auto w-[min(92vw,440px)] rounded-xl border border-neutral-200 bg-white p-0 text-neutral-900 shadow-2xl backdrop:bg-neutral-900/40"
    >
      {open && (
        <form
          method="dialog"
          className="flex flex-col gap-4 p-5"
          onSubmit={(e) => {
            e.preventDefault();
            if (ready && !pending) onConfirm();
          }}
        >
          <h2 id="confirm-title" className="text-base font-semibold">{title}</h2>
          {children && <div className="text-sm text-neutral-700">{children}</div>}
          {typeToConfirm && (
            <label className="flex flex-col gap-1.5 text-sm">
              <span>Type <strong className="font-mono">{typeToConfirm}</strong> to confirm</span>
              <input autoFocus value={typed} onChange={(e) => setTyped(e.target.value)} className="h-10 rounded-lg border border-neutral-300 px-3 font-mono" autoComplete="off" />
            </label>
          )}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onCancel} className={cx(btn, "border border-neutral-300 bg-white hover:bg-neutral-50")}>Cancel</button>
            <button type="submit" autoFocus={!typeToConfirm} disabled={!ready || pending} className={cx(btn, danger ? "bg-red-600 text-white hover:bg-red-700" : "bg-neutral-900 text-white hover:bg-neutral-800")}>
              {pending && <Loader2 className="size-4 animate-spin" />} {confirmLabel}
            </button>
          </div>
        </form>
      )}
    </dialog>
  );
}

export function Drawer({ open, title, onClose, children, footer, wide = false }: { open: boolean; title: string; onClose: () => void; children: React.ReactNode; footer?: React.ReactNode; wide?: boolean }) {
  const ref = useModal(open, onClose);
  return (
    <dialog
      ref={ref}
      aria-labelledby="drawer-title"
      onClick={(e) => e.target === ref.current && onClose()}
      className={cx("ml-auto mr-0 mt-0 h-dvh max-h-dvh w-full max-w-full rounded-none border-l border-neutral-200 bg-white p-0 text-neutral-900 shadow-2xl backdrop:bg-neutral-900/30", wide ? "sm:w-[640px]" : "sm:w-[440px]")}
    >
      {open && (
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-3">
            <h2 id="drawer-title" className="text-base font-semibold">{title}</h2>
            <button type="button" onClick={onClose} aria-label="Close" className="rounded p-1.5 hover:bg-neutral-100"><X className="size-4" /></button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-4">{children}</div>
          {footer && <div className="border-t border-neutral-200 px-4 py-3">{footer}</div>}
        </div>
      )}
    </dialog>
  );
}
