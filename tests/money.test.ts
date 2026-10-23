import { describe, expect, it } from "vitest";
import { amountInWords, discountPercent, formatPrice, pricePerMl, rupeesToPaise, splitInclusiveGst, toDecimalString } from "@/lib/money";

describe("money", () => {
  it("formats INR in Indian grouping", () => {
    expect(formatPrice(249900)).toBe("₹2,499");
    expect(formatPrice(12345600)).toBe("₹1,23,456");
    expect(formatPrice(249950, { exact: true })).toBe("₹2,499.50");
  });

  it("rejects non-integer paise", () => {
    expect(() => formatPrice(10.5)).toThrow();
  });

  it("converts and rounds", () => {
    expect(rupeesToPaise(19.99)).toBe(1999);
    expect(toDecimalString(249900)).toBe("2499.00");
    expect(pricePerMl(249900, 50)).toBe(4998);
    expect(discountPercent(299900, 249900)).toBe(17);
    expect(discountPercent(249900, 249900)).toBe(0);
  });

  it("splits inclusive GST without losing a paisa", () => {
    for (const gross of [1, 99, 249900, 333333, 1234567]) {
      for (const inter of [true, false]) {
        const s = splitInclusiveGst(gross, 1800, inter);
        expect(s.taxableP + s.cgstP + s.sgstP + s.igstP).toBe(gross);
      }
    }
    expect(splitInclusiveGst(118000, 1800, false)).toEqual({ taxableP: 100000, cgstP: 9000, sgstP: 9000, igstP: 0 });
    expect(splitInclusiveGst(118000, 1800, true)).toEqual({ taxableP: 100000, cgstP: 0, sgstP: 0, igstP: 18000 });
  });
});

describe("amountInWords", () => {
  it("uses the Indian numbering system", () => {
    expect(amountInWords(349900)).toBe("Rupees Three Thousand Four Hundred Ninety Nine Only");
    expect(amountInWords(12345650)).toBe("Rupees One Lakh Twenty Three Thousand Four Hundred Fifty Six and Fifty Paise Only");
    expect(amountInWords(1000000000)).toBe("Rupees One Crore Only");
    expect(amountInWords(5)).toBe("Rupees Zero and Five Paise Only");
  });
});
