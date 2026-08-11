import type { Role } from "~/domain/auth/access/rbac";
import type { AuthSession } from "~/domain/auth/access/session-types";
import { fail, forbidden } from "~/domain/errors";
import type { UserId } from "~/domain/ids";
import { throwDomain } from "~/server/platform/action/domain-error";

export const ADMIN_BYPASS = new Set<Role>(["admin", "superuser"]);

// Missing records are not found; non-owners are forbidden unless their role
// bypasses ownership. Prefer SQL ownership checks for simple mutations.
export function assertOwnedRecord<T>(
  record: T | null | undefined,
  getOwnerId: (record: T) => UserId | null | undefined,
  session: Pick<AuthSession, "userId" | "role">,
  options?: {
    resourceName?: string;
    bypassRoles?: ReadonlySet<Role>;
  },
): T {
  if (record == null) {
    throwDomain(fail("resource_not_found"));
  }

  const bypassRoles = options?.bypassRoles ?? ADMIN_BYPASS;

  if (!bypassRoles.has(session.role) && getOwnerId(record) !== session.userId) {
    throwDomain(forbidden({ code: "ownership_forbidden" }));
  }

  return record;
}
