import { describe, expect, it } from "vitest";
import { getPermissions, hasPermission, type Permission, type Role } from "../../src/lib/auth/rbac";

const ALL_PERMISSIONS: Permission[] = [
    "leads:read",
    "leads:request",
    "quota:read",
    "quota:allocate",
    "sales:create",
    "sales:submit",
    "sales:review",
    "sales:approve",
    "team:read",
    "team:manage",
    "inventory:read",
    "inventory:manage",
    "hr:read",
    "hr:manage",
    "admin:read",
    "admin:manage",
    "audit:read",
];

const EXPECTED_ROLE_PERMISSIONS: Record<Role, Permission[]> = {
    executive: ["leads:read", "leads:request", "quota:read", "sales:create", "sales:submit"],
    supervisor: ["leads:read", "leads:request", "quota:read", "quota:allocate", "sales:create", "sales:submit", "sales:review", "sales:approve", "team:read", "team:manage", "audit:read"],
    back_office: ["sales:review", "sales:approve", "audit:read"],
    sales_manager: ["leads:read", "quota:read", "quota:allocate", "sales:review", "sales:approve", "team:read", "team:manage", "inventory:read", "audit:read", "admin:read", "admin:manage"],
    logistics: ["inventory:read", "inventory:manage"],
    hr: ["hr:read", "hr:manage", "team:read"],
    admin: ["leads:read", "quota:read", "quota:allocate", "sales:review", "team:read", "team:manage", "inventory:read", "inventory:manage", "hr:read", "hr:manage", "admin:read", "admin:manage", "audit:read"],
    superuser: ["leads:read", "leads:request", "quota:read", "quota:allocate", "sales:create", "sales:submit", "sales:review", "sales:approve", "team:read", "team:manage", "inventory:read", "inventory:manage", "hr:read", "hr:manage", "admin:read", "admin:manage", "audit:read"],
};

describe("rbac boundaries", () => {
    it("matches exact permission matrix for every role", () => {
        for (const [role, expected] of Object.entries(EXPECTED_ROLE_PERMISSIONS) as Array<[Role, Permission[]]>) {
            const actual = [...getPermissions(role)].sort();
            expect(actual).toEqual([...expected].sort());

            for (const permission of ALL_PERMISSIONS) {
                expect(hasPermission(role, permission)).toBe(expected.includes(permission));
            }
        }
    });

    it("returns empty permissions for unknown role", () => {
        expect(getPermissions("unknown_role")).toEqual([]);
        for (const permission of ALL_PERMISSIONS) {
            expect(hasPermission("unknown_role", permission)).toBe(false);
        }
    });

    it("prevents privilege inversion between executive and supervisor", () => {
        const executivePerms = new Set(getPermissions("executive"));
        const supervisorPerms = new Set(getPermissions("supervisor"));

        expect(supervisorPerms.has("sales:approve")).toBe(true);
        expect(executivePerms.has("sales:approve")).toBe(false);

        for (const p of executivePerms) {
            expect(supervisorPerms.has(p)).toBe(true);
        }
    });
});
