"use client";

import dynamic from "next/dynamic";
import { useState, useSyncExternalStore } from "react";
import { estimate, type DeliveryZones } from "@/lib/delivery";
import { useProductState } from "./ProductState";

function TruckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2" />
      <path d="M15 18H9" />
      <path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14" />
      <circle cx="17" cy="18" r="2" />
      <circle cx="7" cy="18" r="2" />
    </svg>
  );
}

function ShareIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <line x1="8.59" x2="15.42" y1="13.51" y2="17.49" />
      <line x1="15.41" x2="8.59" y1="6.51" y2="10.49" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

const StockNotifyForm = dynamic(() => import("./StockNotifyForm").then((m) => m.StockNotifyForm), { ssr: false });

/** Buy-box helpers that follow the selected size (plan.md §10.3). */

const day = new Intl.DateTimeFormat("en-IN", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
const PIN = "aq.pincode";
const noop = () => () => {};
function readPin() {
  try {
    return localStorage.getItem(PIN) ?? "";
  } catch {
    return "";
  }
}

export function DeliveryEstimate({ zones, storeStateCode, codEnabled, codMaxOrderP }: { zones: DeliveryZones; storeStateCode: string; codEnabled: boolean; codMaxOrderP: number }) {
  const { variants, sku } = useProductState();
  const v = variants.find((x) => x.sku === sku);
  // The last PIN used on this device (read after hydration, so server and client HTML match).
  const saved = useSyncExternalStore(noop, readPin, () => "");
  const [typed, setTyped] = useState<string | null>(null);
  const [checkedTyped, setChecked] = useState(false);
  const pin = typed ?? saved;
  const setPin = (v: string) => setTyped(v);
  const checked = typed === null ? saved.length === 6 : checkedTyped;
  const e = checked && pin.length === 6 ? estimate(pin, storeStateCode, zones) : null;
  const cod = codEnabled && !!v?.codAllowed && (v?.priceP ?? 0) <= codMaxOrderP;
  return (
    <div className="flex flex-col gap-2 text-sm">
      <form
        className="flex items-center gap-2"
        onSubmit={(ev) => {
          ev.preventDefault();
          setChecked(true);
          try {
            localStorage.setItem(PIN, pin);
          } catch {
            // ignore
          }
        }}
      >
        <TruckIcon className="size-4 shrink-0 text-accent" />
        <label htmlFor="pdp-pin" className="sr-only">Delivery PIN code</label>
        <input id="pdp-pin" inputMode="numeric" maxLength={6} autoComplete="postal-code" value={pin} onChange={(x) => { setPin(x.target.value.replace(/\D/g, "")); setChecked(false); }} placeholder="Enter PIN code for delivery date" className="h-9 w-56 rounded-full border border-white/15 bg-transparent px-3 text-sm placeholder:text-muted focus:border-gold focus:outline-none" />
        <button type="submit" disabled={pin.length !== 6} className="h-9 rounded-full border border-white/20 px-3 text-xs uppercase tracking-[0.15em] hover:border-gold disabled:opacity-40">Check</button>
      </form>
      <p aria-live="polite" className="pl-6 text-muted">
        {e ? (
          <>
            Delivered by <span className="text-fg">{day.format(e.earliest)}</span>
            {e.latest.getTime() !== e.earliest.getTime() && <> – <span className="text-fg">{day.format(e.latest)}</span></>}
            {" · "}
            {cod ? "Cash on delivery available" : "Prepaid only"}
          </>
        ) : checked && pin.length === 6 ? (
          "We couldn't read that PIN code. Please check it."
        ) : null}
      </p>
    </div>
  );
}

export function StockNotify({ defaultEmail = "" }: { defaultEmail?: string }) {
  const { variants, sku } = useProductState();
  const v = variants.find((x) => x.sku === sku);
  if (!v || v.stock > 0) return null;
  return <StockNotifyForm label={v.label} sku={v.sku} defaultEmail={defaultEmail} />;
}

export function ShareButton({ name, slug }: { name: string; slug: string }) {
  const { sku } = useProductState();
  const [copied, setCopied] = useState(false);
  async function share() {
    const url = `${window.location.origin}/perfume/${slug}${sku ? `?v=${sku}` : ""}`;
    try {
      if (navigator.share) await navigator.share({ title: name, url });
      else {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 2000);
      }
    } catch {
      // Share sheet dismissed.
    }
  }
  return (
    <button type="button" onClick={share} className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-fg">
      {copied ? <CheckIcon className="size-4" /> : <ShareIcon className="size-4" />} {copied ? "Link copied" : "Share"}
    </button>
  );
}
