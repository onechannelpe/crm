import type { Role } from "~/lib/auth/access/rbac";
import type { User } from "~/lib/db/schema";

const STRONG_AUTH_ROLES = ["sales_manager", "admin", "superuser"] as const;

export function deriveStrongAuthRequired(role: Role): number {
  return STRONG_AUTH_ROLES.some((item) => item === role) ? 1 : 0;
}

export function requiresStrongAuth(user: Pick<User, "strong_auth_required">) {
  return user.strong_auth_required === 1;
}

export function isStrongAuthEnrolled(
  user: Pick<User, "strong_auth_enrolled_at">,
) {
  return user.strong_auth_enrolled_at !== null;
}
