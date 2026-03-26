import { describe, expect, it } from "vitest";

import {
  ROLES,
  getPermissions,
  hasPermission,
  type Permission,
  type Role,
} from "../../src/lib/auth/access/rbac";
import { PERMISSION_MANIFEST } from "../support/security-manifests";

const ALL_PERMISSIONS: Permission[] = [
  "lead:work",
  "sales:create",
  "sales:submit",
  "sales:review",
  "sales:approve",
  "search:use",
  "capacity:read:self",
  "capacity:request:self",
  "capacity:read:team",
  "capacity:manage",
  "capacity:approve",
  "capacity:policy:manage",
  "capacity:audit:read",
  "team:read",
  "team:manage",
  "inventory:read",
  "inventory:manage",
  "hr:read",
  "hr:manage",
  "admin:read",
  "admin:manage",
  "audit:read",
  "lead:register",
  "lead:view:all",
  "lead:review",
  "lead:reassign",
  "quotation:manage",
  "integration:manage",
];

const EXPECTED_ROLE_PERMISSIONS: Record<Role, Permission[]> =
  PERMISSION_MANIFEST;

describe("rbac boundaries", () => {
  it("matches exact permission matrix for every role", () => {
    for (const role of ROLES) {
      const expected = EXPECTED_ROLE_PERMISSIONS[role];
      const actual = [...getPermissions(role)].toSorted();
      expect(actual).toEqual([...expected].toSorted());

      for (const permission of ALL_PERMISSIONS) {
        expect(hasPermission(role, permission)).toBe(
          expected.includes(permission),
        );
      }
    }
  });

  it("returns empty permissions for unknown role", () => {
    expect(getPermissions("unknown_role")).toEqual([]);
    for (const permission of ALL_PERMISSIONS) {
      expect(hasPermission("unknown_role", permission)).toBe(false);
    }
  });

  it("keeps executive and supervisor permissions on separate boundaries", () => {
    const executivePerms = new Set(getPermissions("executive"));
    const supervisorPerms = new Set(getPermissions("supervisor"));

    expect(supervisorPerms.has("sales:approve")).toBe(true);
    expect(executivePerms.has("sales:approve")).toBe(false);
    expect(supervisorPerms.has("team:manage")).toBe(true);
    expect(executivePerms.has("team:manage")).toBe(false);
    expect(executivePerms.has("lead:register")).toBe(true);
    expect(supervisorPerms.has("lead:register")).toBe(false);
  });
});
