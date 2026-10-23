/**
 * All money is integer paise (docs/04 §1). This module is the only place that converts.
 */

export type Paise = number;

const inr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
const inrExact = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 2 });

export function assertPaise(value: number): asserts value is Paise {
  if (!Number.isSafeInteger(value)) throw new Error(`Money must be integer paise, got ${value}`);
}

export function rupeesToPaise(rupees: number): Paise {
  return Math.round(rupees * 100);
}

/** "₹2,499" (whole rupees) or "₹2,499.50" when `exact` and there are paise. */
export function formatPrice(paise: Paise, opts: { exact?: boolean } = {}): string {
  assertPaise(paise);
  const rupees = paise / 100;
  return opts.exact && paise % 100 !== 0 ? inrExact.format(rupees) : inr.format(rupees);
}

/** Decimal string for structured data / feeds, e.g. "2499.00". */
export function toDecimalString(paise: Paise): string {
  assertPaise(paise);
  return (paise / 100).toFixed(2);
}

export function pricePerMl(paise: Paise, volumeMl: number): Paise {
  return Math.round(paise / volumeMl);
}

export function discountPercent(mrp: Paise, price: Paise): number {
  if (mrp <= 0 || price >= mrp) return 0;
  return Math.round(((mrp - price) / mrp) * 100);
}

/**
 * Splits a GST-inclusive amount. Integer-only: taxable + tax always equals gross exactly.
 * rateBps: 1800 = 18%.
 */
export function splitInclusiveGst(grossP: Paise, rateBps: number, interState: boolean) {
  assertPaise(grossP);
  const taxableP = Math.round((grossP * 10000) / (10000 + rateBps));
  const taxP = grossP - taxableP;
  if (interState) return { taxableP, cgstP: 0, sgstP: 0, igstP: taxP };
  const cgstP = Math.floor(taxP / 2);
  return { taxableP, cgstP, sgstP: taxP - cgstP, igstP: 0 };
}

const ONES = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

function under1000(n: number): string {
  const h = Math.floor(n / 100);
  const r = n % 100;
  const rest = r < 20 ? ONES[r] : `${TENS[Math.floor(r / 10)]}${r % 10 ? ` ${ONES[r % 10]}` : ""}`;
  return [h ? `${ONES[h]} Hundred` : "", rest].filter(Boolean).join(" ");
}

/** Indian-system words for invoices: 123456.50 → "Rupees One Lakh Twenty Three Thousand Four Hundred Fifty Six and Fifty Paise Only". */
export function amountInWords(paise: Paise): string {
  assertPaise(paise);
  let rupees = Math.floor(paise / 100);
  const p = paise % 100;
  if (rupees === 0 && p === 0) return "Rupees Zero Only";
  const parts: string[] = [];
  const crore = Math.floor(rupees / 10000000);
  rupees %= 10000000;
  const lakh = Math.floor(rupees / 100000);
  rupees %= 100000;
  const thousand = Math.floor(rupees / 1000);
  rupees %= 1000;
  if (crore) parts.push(`${under1000(crore)} Crore`);
  if (lakh) parts.push(`${under1000(lakh)} Lakh`);
  if (thousand) parts.push(`${under1000(thousand)} Thousand`);
  if (rupees) parts.push(under1000(rupees));
  const words = parts.join(" ");
  return `Rupees ${words || "Zero"}${p ? ` and ${under1000(p)} Paise` : ""} Only`;
}
