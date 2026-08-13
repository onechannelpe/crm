import { describe, expect, it } from "vitest";

import { canAssignRole } from "~/domain/auth/access/rbac";
import { getAssignableRoleOptions } from "~/domain/auth/access/role-display";

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

  it("restricts sales manager to staffing their own team", () => {
    expect(canAssignRole("sales_manager", "executive")).toBe(true);
    expect(canAssignRole("sales_manager", "supervisor")).toBe(true);
    expect(canAssignRole("sales_manager", "back_office")).toBe(true);
    expect(canAssignRole("sales_manager", "sales_manager")).toBe(false);
    expect(canAssignRole("sales_manager", "logistics")).toBe(false);
    expect(canAssignRole("sales_manager", "hr")).toBe(false);
    expect(canAssignRole("sales_manager", "admin")).toBe(false);
    expect(canAssignRole("sales_manager", "superuser")).toBe(false);
    expect(getAssignableRoleOptions("sales_manager")).toEqual([
      { value: "executive", label: "Ejecutivo" },
      { value: "supervisor", label: "Supervisor" },
      { value: "back_office", label: "Validación de ventas" },
    ]);
  });
});
