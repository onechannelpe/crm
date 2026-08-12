import type { Role } from "~/domain/auth/access/rbac";

const STRONG_AUTH_ROLES: ReadonlySet<Role> = new Set([
  "sales_manager",
  "admin",
  "superuser",
]);

export function requiresStrongAuthRole(role: Role): boolean {
  return STRONG_AUTH_ROLES.has(role);
}
