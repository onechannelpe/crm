import type { Permission, Role } from "~/lib/auth/access/rbac";
import { deriveStrongAuthRequired } from "~/lib/auth/security/strong-auth-state";

const STEP_UP_PERMISSIONS: ReadonlySet<Permission> = new Set(["admin:manage"]);

export function isPrivilegedRole(role: Role): boolean {
  return deriveStrongAuthRequired(role) === 1;
}

export function requiresStepUp(permission: Permission): boolean {
  return STEP_UP_PERMISSIONS.has(permission);
}
