import type { Selectable } from "kysely";

import { canManageMember } from "~/lib/auth/access/member-management";
import type { UsersTable } from "~/lib/db/types";
import type { AppContext } from "~/server/platform/action/context";
import { fail, type DomainError } from "~/server/shared/domain-error";
import type { UserId } from "~/server/shared/ids";
import { Err, Ok, type Result } from "~/server/shared/result";
import type { UsersRepo } from "~/server/users/repos-users";

export type MemberRow = Selectable<UsersTable>;

// Single owner of the "an administrator may act on this member" invariant, so
// every member write use-case enforces the same three checks: the target must
// exist in the actor's branch, must not be the actor themselves, and the
// actor's role must outrank the target's. Delete additionally applies the
// stricter canDeleteMember check at its own site.
export async function authorizeMemberManagement(
  ctx: AppContext,
  users: UsersRepo,
  userId: UserId,
): Promise<Result<MemberRow, DomainError>> {
  const target = await users.findById(userId);
  if (!target || target.branch_id !== ctx.actor.branchId) {
    return Err(fail("user_not_found"));
  }
  if (target.id === ctx.actor.userId) {
    return Err(fail("cannot_manage_self"));
  }
  if (!canManageMember(ctx.actor.role, target.role)) {
    return Err(fail("cannot_manage_member"));
  }
  return Ok(target);
}
