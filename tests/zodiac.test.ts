import { describe, expect, it } from "vitest";
import { ELEMENT_INFO, SIGNS, ZODIAC, ZODIAC_SLUGS } from "@/config/zodiac";
import { contrastRatio } from "@/lib/color";
import { currentSeasonSign, sunSignFor } from "@/lib/zodiac-math";

describe("sunSignFor", () => {
  it.each([
    [3, 21, "aries"], [4, 19, "aries"], [4, 20, "taurus"], [5, 20, "taurus"], [5, 21, "gemini"],
    [6, 21, "cancer"], [7, 22, "cancer"], [7, 23, "leo"], [8, 23, "virgo"], [9, 23, "libra"],
    [10, 22, "libra"], [10, 23, "scorpio"], [11, 22, "sagittarius"], [12, 21, "sagittarius"],
    [12, 22, "capricorn"], [12, 31, "capricorn"], [1, 1, "capricorn"], [1, 19, "capricorn"],
    [1, 20, "aquarius"], [2, 18, "aquarius"], [2, 19, "pisces"], [2, 29, "pisces"], [3, 20, "pisces"],
  ])("%i/%i → %s", (m, d, expected) => {
    expect(sunSignFor(m, d).slug).toBe(expected);
  });

  it("covers every day of a leap year exactly once", () => {
    for (let m = 1; m <= 12; m++) {
      const days = new Date(Date.UTC(2024, m, 0)).getUTCDate();
      for (let d = 1; d <= days; d++) expect(() => sunSignFor(m, d)).not.toThrow();
    }
  });

  it("rejects invalid dates", () => {
    expect(() => sunSignFor(13, 1)).toThrow(RangeError);
  });

  it("uses the IST calendar day for the current season", () => {
    // 20 Apr 2026 19:00 UTC is 21 Apr 00:30 IST → Taurus.
    expect(currentSeasonSign(new Date("2026-04-20T19:00:00Z")).slug).toBe("taurus");
  });
});

describe("zodiac config", () => {
  it("has twelve signs in order with unique fragrance slugs", () => {
    expect(SIGNS.map((s) => s.slug)).toEqual([...ZODIAC_SLUGS]);
    expect(new Set(SIGNS.map((s) => s.fragrance.slug)).size).toBe(12);
    SIGNS.forEach((s, i) => expect(s.index).toBe(i + 1));
  });

  it("elements group three signs each and agree with sign.element", () => {
    for (const [el, info] of Object.entries(ELEMENT_INFO)) {
      expect(info.signs).toHaveLength(3);
      info.signs.forEach((slug) => expect(ZODIAC[slug].element).toBe(el));
    }
  });

  it("compatible signs are valid and never the sign itself", () => {
    for (const s of SIGNS) s.compatible.forEach((c) => expect(c === s.slug || !ZODIAC[c]).toBe(false));
  });
});

describe("theme contrast (WCAG 2.2 AA)", () => {
  it.each(SIGNS.map((s) => [s.slug, s.theme] as const))("%s", (_slug, t) => {
    expect(contrastRatio(t.text, t.bg)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(t.text, t.surface)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(t.muted, t.bg)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(t.muted, t.surface)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(t.onPrimary, t.primary)).toBeGreaterThanOrEqual(4.5);
    // Buttons and focus rings are UI components: 3:1 against the page.
    expect(contrastRatio(t.primary, t.bg)).toBeGreaterThanOrEqual(3);
    expect(contrastRatio(t.accent, t.bg)).toBeGreaterThanOrEqual(3);
  });
});
