import type { Permission, Role } from "~/lib/auth/access/rbac";

const PRIVILEGED_ROLES = ["sales_manager", "admin", "superuser"] as const;
const STEP_UP_PERMISSIONS: ReadonlySet<Permission> = new Set(["admin:manage"]);

export function isPrivilegedRole(role: Role): boolean {
  return PRIVILEGED_ROLES.some((item) => item === role);
}

export function requiresStepUp(permission: Permission): boolean {
  return STEP_UP_PERMISSIONS.has(permission);
}
