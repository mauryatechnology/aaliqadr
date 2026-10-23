"use client";

import { site } from "@/config/site";

/** Browser side of Razorpay Checkout: loads the script on demand and opens the modal. */

export interface RazorpayParams {
  keyId: string;
  orderId: string;
  amountP: number;
  name: string;
  email: string;
  phone: string;
}

export interface RazorpaySuccess {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

interface RazorpayInstance {
  open: () => void;
  on: (event: string, cb: (r: { error?: { description?: string } }) => void) => void;
}

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => RazorpayInstance;
  }
}

function loadScript(): Promise<boolean> {
  if (window.Razorpay) return Promise.resolve(true);
  return new Promise((resolve) => {
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

/** Resolves with the signed response, or "dismissed" / "failed" / "unavailable". */
export async function openRazorpay(
  appOrderId: string,
  p: RazorpayParams,
  onFailed?: (message: string) => void,
): Promise<RazorpaySuccess | "dismissed" | "unavailable"> {
  if (!(await loadScript()) || !window.Razorpay) return "unavailable";
  const Ctor = window.Razorpay;
  return new Promise((resolve) => {
    const rzp = new Ctor({
      key: p.keyId,
      amount: p.amountP,
      currency: "INR",
      order_id: p.orderId,
      name: site.name,
      description: `Order ${appOrderId}`,
      prefill: { name: p.name, email: p.email, contact: p.phone },
      notes: { orderId: appOrderId },
      theme: { color: "#C4A044" },
      modal: { ondismiss: () => resolve("dismissed") },
      handler: (r: RazorpaySuccess) => resolve(r),
    });
    rzp.on("payment.failed", (r) => onFailed?.(r.error?.description ?? "The payment failed. You can try again."));
    rzp.open();
  });
}
