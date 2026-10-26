"use client";

import { useState, useTransition } from "react";
import { BellRing, Check, Loader2 } from "lucide-react";
import { notifyMeAction } from "@/actions/catalog";

export function StockNotifyForm({ label, sku, defaultEmail = "" }: { label: string; sku: string; defaultEmail?: string }) {
  const [email, setEmail] = useState(defaultEmail);
  const [done, setDone] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  if (done === sku)
    return <p className="flex items-center gap-2 text-sm text-accent"><Check className="size-4" /> We&apos;ll email you once when {label} is back.</p>;

  return (
    <form
      className="flex flex-col gap-2 rounded-xl border border-white/10 p-3"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const res = await notifyMeAction(sku, email);
          if (res.error) setError(res.error);
          else {
            setError("");
            setDone(sku);
          }
        });
      }}
    >
      <p className="flex items-center gap-2 text-sm"><BellRing className="size-4 text-accent" /> {label} is sold out. Get one email when it&apos;s back.</p>
      <div className="flex gap-2">
        <label htmlFor="notify-email" className="sr-only">Email</label>
        <input id="notify-email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="h-10 min-w-0 flex-1 rounded-full border border-white/15 bg-transparent px-4 text-sm focus:border-gold focus:outline-none" />
        <button type="submit" disabled={pending} className="btn-gold h-10 rounded-full px-4 text-xs uppercase tracking-[0.15em]">{pending ? <Loader2 className="size-4 animate-spin" /> : "Notify me"}</button>
      </div>
      {error && <p role="alert" className="text-xs text-red-300">{error}</p>}
    </form>
  );
}
