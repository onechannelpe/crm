import { forbiddenFault, notFoundFault } from "~/server/shared/domain-error";

import type { Role } from "./rbac";
import type { AuthSession } from "./session-types";

/**
 * Asserts that a fetched record is non-null and owned by the session user.
 *
 * - Throws notFoundFault if record is null/undefined.
 * - Throws forbiddenFault if getOwnerId(record) !== session.userId,
 *   unless session.role is in bypassRoles.
 * - Returns the narrowed non-null record for use in continuation code.
 *
 * Use this in actions that fetch a record before operating on it.
 * For pure-mutation repos that accept userId in the WHERE clause, prefer
 * the db-level pattern instead (repo.findByIdForUser / repo.deleteForUser).
 */
export function assertOwnedRecord<T>(
  record: T | null | undefined,
  getOwnerId: (r: T) => number | null | undefined,
  session: Pick<AuthSession, "userId" | "role">,
  options?: {
    resourceName?: string;
    bypassRoles?: ReadonlySet<Role>;
  },
): T {
  const name = options?.resourceName ?? "Resource";

  if (record == null) {
    throw notFoundFault(`${name} not found`);
  }

  const bypass = options?.bypassRoles ?? ADMIN_BYPASS;
  if (!bypass.has(session.role) && getOwnerId(record) !== session.userId) {
    throw forbiddenFault(
      `You do not have access to this ${name.toLowerCase()}`,
    );
  }

  return record;
}

/** Roles that bypass per-record ownership checks (audit / admin access). */
export const ADMIN_BYPASS = new Set<Role>(["admin", "superuser"]);
