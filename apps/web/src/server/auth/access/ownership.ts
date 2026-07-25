import type { Role } from "~/domain/auth/access/rbac";
import type { AuthSession } from "~/domain/auth/access/session-types";
import { fail, forbidden } from "~/domain/errors";
import type { UserId } from "~/domain/ids";
import { throwDomain } from "~/server/platform/action/domain-error";

// Missing records resolve as not_found; non-owners as forbidden unless their
// role bypasses ownership. Prefer repo-level WHERE ownership for pure mutations
// that can encode the user in SQL.
export function assertOwnedRecord<T>(
  record: T | null | undefined,
  getOwnerId: (r: T) => UserId | null | undefined,
  session: Pick<AuthSession, "userId" | "role">,
  options?: {
    resourceName?: string;
    bypassRoles?: ReadonlySet<Role>;
  },
): T {
  if (record == null) {
    throwDomain(fail("resource_not_found"));
  }

  const bypass = options?.bypassRoles ?? ADMIN_BYPASS;
  if (!bypass.has(session.role) && getOwnerId(record) !== session.userId) {
    throwDomain(forbidden({ code: "ownership_forbidden" }));
  }

  return record;
}

export const ADMIN_BYPASS = new Set<Role>(["admin", "superuser"]);
