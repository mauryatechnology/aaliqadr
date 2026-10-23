import { splitInclusiveGst, type Paise } from "@/lib/money";
import type { PaymentMethod } from "@/lib/order-status";
import type { CartView, PricedLine } from "./pricing";

/**
 * Checkout quote (docs/07 §2). Pure and integer-only: layered on top of `priceCart`, it applies
 * the coupon, COD fee and gift wrap, then splits GST per line (prices are tax-inclusive).
 * The same function prices the quote the customer sees and the order the server creates.
 */

export interface CheckoutSettings {
  codEnabled: boolean;
  codMaxOrderP: Paise;
  codFeeP: Paise;
  giftWrapP: Paise;
}

export interface CouponRule {
  code: string;
  kind: "percent" | "flat" | "free_shipping";
  valueBps: number;
  valueP: Paise;
  /** 0 = no cap */
  maxDiscountP: Paise;
  minSubtotalP: Paise;
}

export interface QuoteInput {
  cart: CartView;
  method: PaymentMethod;
  giftWrap: boolean;
  /** GST state code of the delivery address and of the store's registration. */
  shipToStateCode: string;
  storeStateCode: string;
  coupon?: CouponRule;
  settings: CheckoutSettings;
}

export interface QuoteLine extends PricedLine {
  discountP: Paise;
}

export interface Quote {
  lines: QuoteLine[];
  subtotalP: Paise;
  discountP: Paise;
  couponCode?: string;
  shippingP: Paise;
  codFeeP: Paise;
  giftWrapP: Paise;
  taxableP: Paise;
  cgstP: Paise;
  sgstP: Paise;
  igstP: Paise;
  totalP: Paise;
  isInterState: boolean;
  codAvailable: boolean;
  codUnavailableReason?: string;
}

/** Charges (shipping, COD fee, gift wrap) follow the goods' rate as a composite supply (docs/14 §5). */
const CHARGES_GST_BPS = 1800;

export function couponDiscount(rule: CouponRule, subtotalP: Paise, shippingP: Paise): { discountP: Paise; freeShipping: boolean } {
  if (subtotalP < rule.minSubtotalP) return { discountP: 0, freeShipping: false };
  if (rule.kind === "free_shipping") return { discountP: 0, freeShipping: shippingP > 0 };
  const raw = rule.kind === "percent" ? Math.floor((subtotalP * rule.valueBps) / 10000) : rule.valueP;
  const capped = rule.maxDiscountP > 0 ? Math.min(raw, rule.maxDiscountP) : raw;
  return { discountP: Math.max(0, Math.min(capped, subtotalP)), freeShipping: false };
}

/** Pro-rata split of a discount across lines; the remainder goes to the last line so it sums exactly. */
export function allocateDiscount(lines: PricedLine[], discountP: Paise): Paise[] {
  const total = lines.reduce((n, l) => n + l.lineTotalP, 0);
  if (discountP <= 0 || total <= 0) return lines.map(() => 0);
  let given = 0;
  return lines.map((l, i) => {
    if (i === lines.length - 1) return discountP - given;
    const share = Math.floor((discountP * l.lineTotalP) / total);
    given += share;
    return share;
  });
}

export function quoteCheckout(input: QuoteInput): Quote {
  const { cart, settings } = input;
  const isInterState = input.shipToStateCode !== input.storeStateCode;
  const subtotalP = cart.subtotalP;

  const c = input.coupon ? couponDiscount(input.coupon, subtotalP, cart.shippingP) : { discountP: 0, freeShipping: false };
  const shippingP = c.freeShipping ? 0 : cart.shippingP;
  const shares = allocateDiscount(cart.lines, c.discountP);
  const lines: QuoteLine[] = cart.lines.map((l, i) => ({ ...l, discountP: shares[i] ?? 0 }));

  const giftWrapP = input.giftWrap ? settings.giftWrapP : 0;
  const preCodTotal = subtotalP - c.discountP + shippingP + giftWrapP;

  let codAvailable = settings.codEnabled;
  let codUnavailableReason: string | undefined;
  if (!settings.codEnabled) codUnavailableReason = "Cash on delivery is currently unavailable.";
  else if (lines.some((l) => !l.codAllowed)) {
    codAvailable = false;
    codUnavailableReason = "One of the items in your bag is prepaid only.";
  } else if (preCodTotal > settings.codMaxOrderP) {
    codAvailable = false;
    codUnavailableReason = "Cash on delivery is available on smaller orders only.";
  }
  const codFeeP = input.method === "cod" && codAvailable ? settings.codFeeP : 0;

  let taxableP = 0;
  let cgstP = 0;
  let sgstP = 0;
  let igstP = 0;
  const add = (grossP: Paise, rateBps: number) => {
    if (grossP <= 0) return;
    const s = splitInclusiveGst(grossP, rateBps, isInterState);
    taxableP += s.taxableP;
    cgstP += s.cgstP;
    sgstP += s.sgstP;
    igstP += s.igstP;
  };
  for (const l of lines) add(l.lineTotalP - l.discountP, l.gstRateBps);
  add(shippingP + codFeeP + giftWrapP, CHARGES_GST_BPS);

  return {
    lines,
    subtotalP,
    discountP: c.discountP,
    couponCode: c.discountP > 0 || c.freeShipping ? input.coupon?.code : undefined,
    shippingP,
    codFeeP,
    giftWrapP,
    taxableP,
    cgstP,
    sgstP,
    igstP,
    totalP: preCodTotal + codFeeP,
    isInterState,
    codAvailable,
    codUnavailableReason,
  };
}
