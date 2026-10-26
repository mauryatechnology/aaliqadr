import { describe, expect, it } from "vitest";
import { dateRange, listQuery, nextSort, parseList, rx, type ListSpec } from "@/lib/list-params";

const spec: ListSpec = { sorts: ["date", "total"], filters: ["status", "from", "to"] };

describe("list params", () => {
  it("parses defaults", () => {
    expect(parseList({}, spec)).toEqual({ q: "", page: 1, size: 25, sort: "date", dir: "desc", f: {} });
  });

  it("rejects unknown sorts, sizes and filters", () => {
    const s = parseList({ sort: "evil", size: "1000", page: "-3", hack: "x", dir: "sideways" }, spec);
    expect(s).toMatchObject({ sort: "date", size: 25, page: 1, dir: "desc", f: {} });
  });

  it("reads multi-value filters", () => {
    expect(parseList({ status: "shipped, delivered,," }, spec).f).toEqual({ status: ["shipped", "delivered"] });
  });

  it("round-trips through the URL", () => {
    const s = parseList({ q: "ram", status: "shipped,delivered", sort: "total", dir: "asc", size: "50", page: "3" }, spec);
    const again = parseList(Object.fromEntries(new URLSearchParams(listQuery(s, spec).slice(1))), spec);
    expect(again).toEqual(s);
  });

  it("omits defaults and resets nothing it isn't told to", () => {
    const s = parseList({}, spec);
    expect(listQuery(s, spec)).toBe("");
    expect(listQuery(s, spec, { page: 2 })).toBe("?page=2");
    expect(listQuery(s, spec, { f: { status: ["paid"] } })).toBe("?status=paid");
  });

  it("cycles sort desc → asc → default", () => {
    let s = parseList({}, spec);
    s = { ...s, ...nextSort(s, spec, "total") };
    expect([s.sort, s.dir]).toEqual(["total", "desc"]);
    s = { ...s, ...nextSort(s, spec, "total") };
    expect([s.sort, s.dir]).toEqual(["total", "asc"]);
    s = { ...s, ...nextSort(s, spec, "total") };
    expect([s.sort, s.dir]).toEqual(["date", "desc"]);
  });

  it("builds IST date ranges", () => {
    const r = dateRange({ from: ["2026-10-01"], to: ["2026-10-31"] })!;
    expect(r.$gte!.toISOString()).toBe("2026-09-30T18:30:00.000Z");
    expect(r.$lte!.toISOString()).toBe("2026-10-31T18:29:59.999Z");
    expect(dateRange({ from: ["not-a-date"] })).toBeUndefined();
  });

  it("escapes regex input", () => {
    expect(rx("a.b*(c)").$regex).toBe("a\\.b\\*\\(c\\)");
  });
});
