import { describe, expect, it } from "vitest";
import { calculateVedicMoon, CITIES_DATABASE, NAKSHATRAS, toJulianDay } from "@/lib/vedic-astro";

describe("vedic-astro", () => {
  it("has exactly 27 nakshatras in order with attributes", () => {
    expect(NAKSHATRAS).toHaveLength(27);
    NAKSHATRAS.forEach((n, i) => expect(n.index).toBe(i));
    expect(NAKSHATRAS[0]?.name).toBe("Ashwini");
    expect(NAKSHATRAS[0]?.gana).toBe("Deva (Divine)");
    expect(NAKSHATRAS[26]?.name).toBe("Revati");
  });

  it("has cities database with coordinates and timezone", () => {
    expect(CITIES_DATABASE.length).toBeGreaterThan(15);
    const delhi = CITIES_DATABASE.find((c) => c.name === "New Delhi");
    expect(delhi).toBeDefined();
    expect(delhi?.tz).toBe(5.5);
  });

  it("calculates Julian Day accurately", () => {
    // J2000.0 is 2000-01-01 12:00 UTC = 2451545.0
    const jd = toJulianDay(2000, 1, 1, 12, 0, 0);
    expect(Math.abs(jd - 2451545.0)).toBeLessThan(0.01);
  });

  it("calculates Vedic Moon sign, Nakshatra, and Pada within valid ranges", () => {
    const res = calculateVedicMoon(1995, 8, 15, 14, 30, 5.5);
    expect(res.sign).toBeDefined();
    expect(res.sign.index).toBeGreaterThanOrEqual(1);
    expect(res.sign.index).toBeLessThanOrEqual(12);
    expect(res.nakshatra.index).toBeGreaterThanOrEqual(0);
    expect(res.nakshatra.index).toBeLessThanOrEqual(26);
    expect(res.pada).toBeGreaterThanOrEqual(1);
    expect(res.pada).toBeLessThanOrEqual(4);
    expect(res.degreesInSign).toBeGreaterThanOrEqual(0);
    expect(res.degreesInSign).toBeLessThan(30);
    expect(typeof res.isCusp).toBe("boolean");
  });

  it("handles boundary time (midnight and noon)", () => {
    const noon = calculateVedicMoon(2026, 10, 24, 12, 0, 5.5);
    const midnight = calculateVedicMoon(2026, 10, 24, 0, 0, 5.5);
    expect(noon.sign).toBeDefined();
    expect(midnight.sign).toBeDefined();
  });
});
