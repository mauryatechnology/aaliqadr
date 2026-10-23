"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Loader2, Lock } from "lucide-react";
import { retryPaymentAction, verifyPaymentAction } from "@/actions/checkout";
import { cancelMyOrderAction } from "@/actions/account";
import { openRazorpay } from "@/lib/razorpay-client";

/** Completes an order still awaiting online payment. */
export function RetryPaymentButton({ orderId, accessKey }: { orderId: string; accessKey: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function pay() {
    setError(null);
    start(async () => {
      const res = await retryPaymentAction({ orderId, accessKey });
      if (!res.ok) return setError(res.error);
      if (res.data.kind !== "razorpay") return router.refresh();
      const outcome = await openRazorpay(orderId, res.data.razorpay, setError);
      if (outcome === "unavailable") return setError("The payment window couldn't load. Check your connection and try again.");
      if (outcome === "dismissed") return;
      await verifyPaymentAction({ orderId, accessKey, ...outcome });
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <button type="button" onClick={pay} disabled={pending} className="flex h-12 items-center justify-center gap-2 rounded-full bg-gold px-8 font-caps text-xs uppercase tracking-[0.22em] text-obsidian disabled:opacity-60">
        {pending ? <Loader2 className="size-4 animate-spin" /> : <Lock className="size-4" />} Complete payment
      </button>
      {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
    </div>
  );
}

/** Two-step cancel: no browser confirm dialog, and no accidental single-click cancellation. */
export function CancelOrderButton({ orderId, accessKey }: { orderId: string; accessKey?: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function cancel() {
    start(async () => {
      const res = await cancelMyOrderAction({ orderId, accessKey });
      if (!res.ok) return setMessage(res.error);
      setMessage(res.refunded ? "Cancelled. Your refund has been initiated (5–7 bank working days)." : "Your order has been cancelled.");
      setConfirming(false);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-2">
      {confirming ? (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-red-400/40 p-3 text-sm">
          <span>Cancel this order?</span>
          <button type="button" onClick={cancel} disabled={pending} className="flex items-center gap-2 rounded-full bg-red-500/80 px-4 py-2 font-medium text-white disabled:opacity-60">
            {pending && <Loader2 className="size-4 animate-spin" />} Yes, cancel
          </button>
          <button type="button" onClick={() => setConfirming(false)} className="rounded-full px-4 py-2 text-muted hover:text-fg">
            Keep order
          </button>
        </div>
      ) : (
        <button type="button" onClick={() => setConfirming(true)} className="self-start text-sm text-muted underline underline-offset-4 hover:text-fg">
          Cancel order
        </button>
      )}
      {message && <p aria-live="polite" className="text-sm text-muted">{message}</p>}
    </div>
  );
}
