import { describe, it, expect } from "vitest";
import { BADGES } from "@/server/catalog/types";

describe("Security & Role Checks", () => {
  const _ROLES = ["customer", "staff", "admin", "owner"] as const;
  type Role = (typeof _ROLES)[number];
  const RANK: Record<Role, number> = { customer: 0, staff: 1, admin: 2, owner: 3 };

  function hasRole(userRole: Role, min: Role): boolean {
    return RANK[userRole] >= RANK[min];
  }

  function requiresTwoFactor(role: Role, twoFactorEnabled?: boolean): boolean {
    // Admin and owner must have 2FA enabled to access the back office
    if (hasRole(role, "admin") && !twoFactorEnabled) return true;
    return false;
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

  it("requires 2FA enrollment strictly for admin and owner roles", () => {
    // Customers and staff without 2FA don't trigger the mandatory admin gate
    expect(requiresTwoFactor("customer", false)).toBe(false);
    expect(requiresTwoFactor("staff", false)).toBe(false);

    // Admin without 2FA is blocked
    expect(requiresTwoFactor("admin", false)).toBe(true);
    expect(requiresTwoFactor("admin", true)).toBe(false);

    // Owner without 2FA is blocked
    expect(requiresTwoFactor("owner", false)).toBe(true);
    expect(requiresTwoFactor("owner", true)).toBe(false);
  });

  it("includes all canonical merchandise badges for catalog bulk editing", () => {
    expect(Object.keys(BADGES)).toEqual(
      expect.arrayContaining(["new", "bestseller", "limited", "exclusive", "gift", "back_in_stock"]),
    );
  });
});
