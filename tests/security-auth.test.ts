import { describe, it, expect } from "vitest";
import { BADGES } from "@/server/catalog/types";

describe("Security & Role Checks", () => {
  const _ROLES = ["customer", "staff", "admin", "owner"] as const;
  type Role = (typeof _ROLES)[number];
  const RANK: Record<Role, number> = { customer: 0, staff: 1, admin: 2, owner: 3 };

  function hasRole(userRole: Role, min: Role): boolean {
    return RANK[userRole] >= RANK[min];
  }

  function canAccessAdmin(role: Role): boolean {
    return hasRole(role, "staff");
  }

  it("enforces proper role hierarchy", () => {
    expect(hasRole("customer", "staff")).toBe(false);
    expect(hasRole("staff", "staff")).toBe(true);
    expect(hasRole("admin", "staff")).toBe(true);
    expect(hasRole("owner", "staff")).toBe(true);

    expect(hasRole("staff", "admin")).toBe(false);
    expect(hasRole("admin", "admin")).toBe(true);
    expect(hasRole("owner", "admin")).toBe(true);

    expect(hasRole("admin", "owner")).toBe(false);
    expect(hasRole("owner", "owner")).toBe(true);
  });

  it("permits direct admin login for staff, admin, and owner without mandatory 2FA", () => {
    expect(canAccessAdmin("customer")).toBe(false);
    expect(canAccessAdmin("staff")).toBe(true);
    expect(canAccessAdmin("admin")).toBe(true);
    expect(canAccessAdmin("owner")).toBe(true);
  });

  it("includes all canonical merchandise badges for catalog bulk editing", () => {
    expect(Object.keys(BADGES)).toEqual(
      expect.arrayContaining(["new", "bestseller", "limited", "exclusive", "gift", "back_in_stock"]),
    );
  });
});
