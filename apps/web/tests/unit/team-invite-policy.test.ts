import { describe, expect, it } from "vitest";

import {
  canAssignRole,
  getAssignableRoleOptions,
} from "../../src/lib/auth/access/role-display";

describe("team invite policy", () => {
  it("enforces assignable roles for hr", () => {
    expect(canAssignRole("hr", "executive")).toBe(true);
    expect(canAssignRole("hr", "admin")).toBe(false);
    expect(canAssignRole("hr", "superuser")).toBe(false);
  });

  it("enforces assignable roles for admin", () => {
    expect(canAssignRole("admin", "hr")).toBe(true);
    expect(canAssignRole("admin", "admin")).toBe(true);
    expect(canAssignRole("admin", "superuser")).toBe(false);
  });

  it("enforces assignable roles for superuser", () => {
    expect(canAssignRole("superuser", "admin")).toBe(true);
    expect(canAssignRole("superuser", "superuser")).toBe(false);
  });

  it("blocks sales manager from assigning roles", () => {
    expect(canAssignRole("sales_manager", "executive")).toBe(false);
    expect(getAssignableRoleOptions("sales_manager")).toEqual([]);
  });
});
