import { describe, expect, it } from "vitest";
import { addWorkingDays, estimate, zoneFor } from "@/lib/delivery";

describe("delivery estimate", () => {
  it("zones by PIN code", () => {
    expect(zoneFor("462016", "23")).toBe("local"); // Bhopal, store in MP
    expect(zoneFor("400001", "23")).toBe("metro"); // Mumbai
    expect(zoneFor("302001", "23")).toBe("rest"); // Jaipur
    expect(zoneFor("781001", "23")).toBe("remote"); // Guwahati
    expect(zoneFor("12345", "23")).toBeNull();
  });

  it("skips Sundays", () => {
    // Sat 24 Oct 2026 + 1 working day = Mon 26 Oct.
    expect(addWorkingDays(new Date("2026-10-24T06:00:00Z"), 1).toISOString().slice(0, 10)).toBe("2026-10-26");
  });

  it("gives a window that starts after dispatch", () => {
    const e = estimate("400001", "23", undefined, new Date("2026-10-26T04:00:00Z"))!; // Mon 9:30 IST
    expect(e.zone).toBe("metro");
    expect(e.earliest.toISOString().slice(0, 10)).toBe("2026-10-29"); // 1 + 2 working days
    expect(e.latest.toISOString().slice(0, 10)).toBe("2026-11-02"); // 2 + 4, skipping Sunday
  });

  it("moves to the next day after 2 pm IST", () => {
    const early = estimate("462016", "23", undefined, new Date("2026-10-26T04:00:00Z"))!;
    const late = estimate("462016", "23", undefined, new Date("2026-10-26T10:00:00Z"))!; // 15:30 IST
    expect(late.earliest.getTime()).toBeGreaterThan(early.earliest.getTime());
  });
});
