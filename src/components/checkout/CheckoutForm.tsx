"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { Check, Gift, Loader2, Lock, Tag, Truck } from "lucide-react";
import { INDIAN_STATES } from "@/config/india";
import { site } from "@/config/site";
import { placeOrderAction, quoteAction, retryPaymentAction, verifyPaymentAction, type Fail } from "@/actions/checkout";
import { cart, useCart } from "@/lib/cart-store";
import { formatPrice } from "@/lib/money";
import { routes } from "@/lib/routes";
import { cn } from "@/lib/cn";
import { openRazorpay } from "@/lib/razorpay-client";
import type { Quote } from "@/server/services/checkout";
import type { PlaceOrderResult } from "@/server/services/orders";

export interface SavedAddress {
  id: string;
  fullName: string;
  phone: string;
  line1: string;
  line2?: string;
  landmark?: string;
  city: string;
  stateCode: string;
  pincode: string;
}

interface Props {
  user: { name: string; email: string; phone?: string } | null;
  addresses: SavedAddress[];
  giftWrapPriceP: number;
}

type Method = "razorpay" | "cod";

const inputCls =
  "h-12 w-full rounded-xl border border-white/15 bg-black/30 px-4 text-base text-fg placeholder:text-muted/70 focus:border-gold focus:outline-none aria-[invalid=true]:border-red-400";

function Field({ label, error, children, className }: { label: string; error?: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={cn("flex flex-col gap-1.5", className)}>
      <span className="text-sm font-medium">{label}</span>
      {children}
      {error && <span className="text-sm text-red-300">{error}</span>}
    </label>
  );
}

export function CheckoutForm({ user, addresses, giftWrapPriceP }: Props) {
  const router = useRouter();
  const lines = useCart();
  const def = addresses[0];
  const [contact, setContact] = useState({ name: user?.name ?? "", email: user?.email ?? "", phone: user?.phone?.replace(/^\+91/, "") ?? "" });
  const [address, setAddress] = useState({
    fullName: def?.fullName ?? user?.name ?? "",
    phone: def?.phone?.replace(/^\+91/, "") ?? user?.phone?.replace(/^\+91/, "") ?? "",
    line1: def?.line1 ?? "",
    line2: def?.line2 ?? "",
    landmark: def?.landmark ?? "",
    city: def?.city ?? "",
    stateCode: def?.stateCode ?? site.legal.stateCode,
    pincode: def?.pincode ?? "",
  });
  const [method, setMethod] = useState<Method>("razorpay");
  const [giftWrap, setGiftWrap] = useState(false);
  const [giftMessage, setGiftMessage] = useState("");
  const [hidePrice, setHidePrice] = useState(false);
  const [saveAddress, setSaveAddress] = useState(true);
  const [couponInput, setCouponInput] = useState("");
  const [coupon, setCoupon] = useState<string | undefined>();
  const [couponError, setCouponError] = useState<string | null>(null);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [pendingPayment, setPendingPayment] = useState<{ orderId: string; accessKey: string } | null>(null);
  const [quoting, startQuote] = useTransition();
  const [placing, setPlacing] = useState(false);
  // One key per checkout visit: a double-submit or retry returns the same order (docs/05 §7).
  const [idemKey] = useState(() => crypto.randomUUID());

  const lineKey = useMemo(() => lines.map((l) => `${l.sku}:${l.qty}`).join(","), [lines]);

  const refreshQuote = useCallback(
    (code: string | undefined) => {
      if (lines.length === 0) return;
      startQuote(async () => {
        const res = await quoteAction({ lines: lines.map(({ sku, qty }) => ({ sku, qty })), method, giftWrap, stateCode: address.stateCode, couponCode: code, email: contact.email || undefined });
        if (res.ok) {
          setQuote(res.data.quote);
          setWarnings(res.data.warnings);
          setCouponError(null);
          if (method === "cod" && !res.data.quote.codAvailable) setMethod("razorpay");
        } else if (res.code === "COUPON_INVALID") {
          setCoupon(undefined);
          setCouponError(res.error);
        } else setError(res.error);
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [lineKey, method, giftWrap, address.stateCode, contact.email],
  );

  useEffect(() => refreshQuote(coupon), [refreshQuote, coupon]);

  function applyCoupon(e: React.FormEvent) {
    e.preventDefault();
    const code = couponInput.trim().toUpperCase();
    if (code) setCoupon(code);
  }

  function handleFail(res: Fail) {
    setError(res.error);
    if (res.fieldErrors) setFieldErrors(res.fieldErrors);
    if (res.quote) setQuote(res.quote);
  }

  async function payOnline(result: Extract<PlaceOrderResult, { kind: "razorpay" }>) {
    const outcome = await openRazorpay(result.orderId, result.razorpay, (msg) => setError(msg));
    if (outcome === "dismissed" || outcome === "unavailable") {
      setPlacing(false);
      setPendingPayment({ orderId: result.orderId, accessKey: result.accessKey });
      setError(outcome === "unavailable" ? "The payment window couldn't load. Check your connection and retry." : "Payment wasn't completed. Your order is held for 30 minutes: retry whenever you're ready.");
      return;
    }
    await verifyPaymentAction({ orderId: result.orderId, accessKey: result.accessKey, ...outcome });
    cart.clear();
    // Even if verification is still settling, the webhook confirms it; the order page shows the live status.
    router.push(routes.order(result.orderId, result.accessKey));
  }

  async function placeOrder() {
    if (!quote) return;
    setError(null);
    setFieldErrors({});
    setPlacing(true);
    try {
      const res = await placeOrderAction({
        lines: lines.map(({ sku, qty }) => ({ sku, qty })),
        method,
        giftWrap,
        giftMessage: giftWrap ? giftMessage : "",
        hidePrice: giftWrap && hidePrice,
        couponCode: coupon,
        contact,
        address,
        expectedTotalP: quote.totalP,
        idempotencyKey: idemKey,
        saveAddress: !!user && saveAddress,
      });
      if (!res.ok) {
        handleFail(res);
        setPlacing(false);
        return;
      }
      if (res.data.kind === "confirmed") {
        cart.clear();
        router.push(routes.order(res.data.orderId, res.data.accessKey));
        return;
      }
      await payOnline(res.data);
    } catch {
      setError("Something went wrong. Please try again.");
      setPlacing(false);
    }
  }

  async function retry() {
    if (!pendingPayment) return;
    setError(null);
    setPlacing(true);
    const res = await retryPaymentAction(pendingPayment);
    if (!res.ok) {
      setError(res.error);
      setPlacing(false);
      return;
    }
    if (res.data.kind === "razorpay") await payOnline(res.data);
    else router.push(routes.order(res.data.orderId, res.data.accessKey));
  }

  const fe = (k: string) => fieldErrors[k]?.[0];

  if (lines.length === 0 && !placing) {
    return (
      <div className="surface flex flex-col items-center gap-4 p-12 text-center">
        <h2 className="font-display text-3xl">Your bag is empty</h2>
        <Link href="/shop" className="rounded-full bg-gold px-6 py-3 font-caps text-xs uppercase tracking-[0.22em] text-obsidian">
          Shop fragrances
        </Link>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1.4fr_1fr]">
      <div className="flex flex-col gap-8">
        {!user && (
          <p className="text-sm text-muted">
            Have an account?{" "}
            <Link href={routes.login("/checkout")} className="text-gold underline underline-offset-4">
              Sign in
            </Link>{" "}
            for saved addresses and order history. Or check out as a guest.
          </p>
        )}

        <section className="surface flex flex-col gap-5 p-6 sm:p-8" aria-labelledby="contact-h">
          <h2 id="contact-h" className="font-display text-3xl">
            Contact
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Full name" error={fe("contact")}>
              <input className={inputCls} autoComplete="name" value={contact.name} onChange={(e) => setContact({ ...contact, name: e.target.value })} />
            </Field>
            <Field label="Mobile number">
              <input className={inputCls} type="tel" inputMode="tel" autoComplete="tel-national" placeholder="10-digit mobile" value={contact.phone} onChange={(e) => setContact({ ...contact, phone: e.target.value })} />
            </Field>
            <Field label="Email (for your order updates)" className="sm:col-span-2">
              <input className={inputCls} type="email" autoComplete="email" value={contact.email} onChange={(e) => setContact({ ...contact, email: e.target.value })} readOnly={!!user} />
            </Field>
          </div>
        </section>

        <section className="surface flex flex-col gap-5 p-6 sm:p-8" aria-labelledby="addr-h">
          <h2 id="addr-h" className="font-display text-3xl">
            Delivery address
          </h2>
          {addresses.length > 1 && (
            <div className="flex flex-wrap gap-2">
              {addresses.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => setAddress({ fullName: a.fullName, phone: a.phone.replace(/^\+91/, ""), line1: a.line1, line2: a.line2 ?? "", landmark: a.landmark ?? "", city: a.city, stateCode: a.stateCode, pincode: a.pincode })}
                  className={cn("rounded-xl border px-4 py-3 text-left text-sm", address.line1 === a.line1 && address.pincode === a.pincode ? "border-gold bg-gold/10" : "border-white/15")}
                >
                  <span className="block font-medium">{a.fullName}</span>
                  <span className="text-muted">
                    {a.line1}, {a.city} {a.pincode}
                  </span>
                </button>
              ))}
            </div>
          )}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Recipient's name">
              <input className={inputCls} autoComplete="shipping name" value={address.fullName} onChange={(e) => setAddress({ ...address, fullName: e.target.value })} />
            </Field>
            <Field label="Recipient's mobile">
              <input className={inputCls} type="tel" inputMode="tel" autoComplete="shipping tel-national" value={address.phone} onChange={(e) => setAddress({ ...address, phone: e.target.value })} />
            </Field>
            <Field label="House / flat, building, street" className="sm:col-span-2">
              <input className={inputCls} autoComplete="shipping address-line1" value={address.line1} onChange={(e) => setAddress({ ...address, line1: e.target.value })} />
            </Field>
            <Field label="Area, locality (optional)">
              <input className={inputCls} autoComplete="shipping address-line2" value={address.line2} onChange={(e) => setAddress({ ...address, line2: e.target.value })} />
            </Field>
            <Field label="Landmark (optional)">
              <input className={inputCls} value={address.landmark} onChange={(e) => setAddress({ ...address, landmark: e.target.value })} />
            </Field>
            <Field label="City">
              <input className={inputCls} autoComplete="shipping address-level2" value={address.city} onChange={(e) => setAddress({ ...address, city: e.target.value })} />
            </Field>
            <Field label="Pincode">
              <input className={inputCls} inputMode="numeric" maxLength={6} autoComplete="shipping postal-code" value={address.pincode} onChange={(e) => setAddress({ ...address, pincode: e.target.value.replace(/\D/g, "") })} />
            </Field>
            <Field label="State" className="sm:col-span-2">
              <select className={inputCls} autoComplete="shipping address-level1" value={address.stateCode} onChange={(e) => setAddress({ ...address, stateCode: e.target.value })}>
                {INDIAN_STATES.map((s) => (
                  <option key={s.code} value={s.code} className="bg-obsidian">
                    {s.name}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          {fieldErrors.address && <p className="text-sm text-red-300">Please complete the address: {fieldErrors.address.join(" ")}</p>}
          {user && (
            <label className="flex items-center gap-3 text-sm">
              <input type="checkbox" checked={saveAddress} onChange={(e) => setSaveAddress(e.target.checked)} className="size-4 accent-[#C4A044]" /> Save this address to my account
            </label>
          )}
        </section>

        <section className="surface flex flex-col gap-4 p-6 sm:p-8" aria-labelledby="gift-h">
          <h2 id="gift-h" className="flex items-center gap-3 font-display text-3xl">
            <Gift className="size-6 text-gold" aria-hidden /> Gifting
          </h2>
          <label className="flex items-center gap-3">
            <input type="checkbox" checked={giftWrap} onChange={(e) => setGiftWrap(e.target.checked)} className="size-4 accent-[#C4A044]" />
            <span>Gift wrap with a handwritten note (+{formatPrice(giftWrapPriceP)})</span>
          </label>
          {giftWrap && (
            <>
              <Field label={`Message for the card (${200 - giftMessage.length} left)`}>
                <textarea className={cn(inputCls, "h-24 py-3")} maxLength={200} value={giftMessage} onChange={(e) => setGiftMessage(e.target.value)} />
              </Field>
              <label className="flex items-center gap-3 text-sm">
                <input type="checkbox" checked={hidePrice} onChange={(e) => setHidePrice(e.target.checked)} className="size-4 accent-[#C4A044]" /> Hide prices in the parcel (the invoice comes to your email)
              </label>
            </>
          )}
        </section>

        <section className="surface flex flex-col gap-4 p-6 sm:p-8" aria-labelledby="pay-h">
          <h2 id="pay-h" className="font-display text-3xl">
            Payment
          </h2>
          <div role="radiogroup" className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {(
              [
                ["razorpay", "Pay online", "UPI, cards, netbanking, wallets"],
                ["cod", "Cash on delivery", quote && !quote.codAvailable ? (quote.codUnavailableReason ?? "Unavailable") : "Small fee applies"],
              ] as const
            ).map(([key, title, sub]) => {
              const disabled = key === "cod" && !!quote && !quote.codAvailable;
              return (
                <button
                  key={key}
                  type="button"
                  role="radio"
                  aria-checked={method === key}
                  disabled={disabled}
                  onClick={() => setMethod(key)}
                  className={cn("flex flex-col items-start gap-1 rounded-xl border px-4 py-4 text-left disabled:cursor-not-allowed disabled:opacity-50", method === key ? "border-gold bg-gold/10" : "border-white/15")}
                >
                  <span className="flex items-center gap-2 font-medium">
                    {method === key && <Check className="size-4 text-gold" aria-hidden />} {title}
                  </span>
                  <span className="text-sm text-muted">{sub}</span>
                </button>
              );
            })}
          </div>
        </section>
      </div>

      <aside className="flex h-fit flex-col gap-5 lg:sticky lg:top-24">
        <div className="surface flex flex-col gap-4 p-6">
          <h2 className="eyebrow">Order summary</h2>
          <ul className="flex flex-col gap-3">
            {(quote?.lines ?? []).map((l) => (
              <li key={l.sku} className="flex justify-between gap-3 text-sm">
                <span>
                  {l.name} <span className="text-muted">· {l.variantLabel} × {l.qty}</span>
                </span>
                <span>{formatPrice(l.lineTotalP)}</span>
              </li>
            ))}
          </ul>
          {warnings.map((w) => (
            <p key={w} className="rounded-lg border border-gold/30 p-2 text-sm text-gold-light">
              {w}
            </p>
          ))}

          <form onSubmit={applyCoupon} className="flex gap-2">
            <label className="sr-only" htmlFor="coupon">
              Coupon code
            </label>
            <input id="coupon" className={cn(inputCls, "h-11 uppercase")} placeholder="Coupon code" value={couponInput} onChange={(e) => setCouponInput(e.target.value)} />
            <button type="submit" className="flex h-11 items-center gap-2 rounded-xl border border-gold/50 px-4 text-sm text-gold">
              <Tag className="size-4" aria-hidden /> Apply
            </button>
          </form>
          {couponError && <p className="text-sm text-red-300">{couponError}</p>}
          {quote?.couponCode && (
            <p className="flex items-center justify-between text-sm text-gold">
              <span>Code {quote.couponCode} applied</span>
              <button type="button" className="underline" onClick={() => { setCoupon(undefined); setCouponInput(""); }}>
                Remove
              </button>
            </p>
          )}

          <dl className="flex flex-col gap-2 border-t border-white/10 pt-4 text-sm" aria-busy={quoting}>
            <Row label="Subtotal" value={quote ? formatPrice(quote.subtotalP) : "…"} />
            {!!quote?.discountP && <Row label="Discount" value={`− ${formatPrice(quote.discountP)}`} accent />}
            <Row label="Shipping" value={quote ? (quote.shippingP ? formatPrice(quote.shippingP) : "Free") : "…"} />
            {!!quote?.giftWrapP && <Row label="Gift wrap" value={formatPrice(quote.giftWrapP)} />}
            {!!quote?.codFeeP && <Row label="Cash on delivery fee" value={formatPrice(quote.codFeeP)} />}
            <div className="flex items-baseline justify-between border-t border-white/10 pt-3">
              <dt className="font-medium">Total</dt>
              <dd className="font-display text-3xl">{quote ? formatPrice(quote.totalP) : "…"}</dd>
            </div>
            {quote && (
              <p className="text-xs text-muted">
                Includes {formatPrice(quote.cgstP + quote.sgstP + quote.igstP)} GST ({quote.isInterState ? "IGST" : "CGST + SGST"}).
              </p>
            )}
          </dl>

          {error && (
            <p role="alert" className="rounded-lg border border-red-400/40 p-3 text-sm text-red-200">
              {error}
            </p>
          )}

          {pendingPayment ? (
            <button type="button" onClick={retry} disabled={placing} className="flex h-14 items-center justify-center gap-2 rounded-full bg-gold font-caps text-xs sm:text-[13px] font-semibold uppercase tracking-[0.18em] text-obsidian shadow-[0_4px_24px_rgba(201,169,110,0.35)] hover:bg-[#E0C892] transition-all disabled:opacity-60 cursor-pointer">
              {placing ? <Loader2 className="size-4 animate-spin" /> : <Lock className="size-4" />} Retry payment
            </button>
          ) : (
            <button type="button" onClick={placeOrder} disabled={!quote || placing || quoting} className="flex h-14 items-center justify-center gap-2 rounded-full bg-gold font-caps text-xs sm:text-[13px] font-semibold uppercase tracking-[0.18em] text-obsidian shadow-[0_4px_24px_rgba(201,169,110,0.35)] hover:bg-[#E0C892] transition-all disabled:opacity-60 cursor-pointer">
              {placing ? <Loader2 className="size-4 animate-spin" /> : <Lock className="size-4" />}
              {method === "cod" ? "Place order" : `Pay ${quote ? formatPrice(quote.totalP) : ""}`}
            </button>
          )}

          <div className="flex items-center justify-center gap-3 pt-1 text-[11px] text-ivory/65">
            <span className="flex items-center gap-1">
              <Lock className="size-3 text-gold" /> 256-bit Bank-grade Encryption
            </span>
            <span>·</span>
            <span>Razorpay Verified</span>
          </div>
          <p className="flex items-center gap-2 text-xs text-muted">
            <Truck className="size-4" aria-hidden /> Ships in 1–2 working days · Secure payments by Razorpay
          </p>
        </div>
      </aside>
    </div>
  );
}

function Row({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex justify-between">
      <dt className="text-muted">{label}</dt>
      <dd className={accent ? "text-gold" : ""}>{value}</dd>
    </div>
  );
}
