import { canAssignRole } from "~/lib/auth/access/rbac";
import type { AppContext } from "~/server/platform/action/context";
import { fail, type DomainError } from "~/server/shared/domain-error";
import { Err, isErr, Ok, type Result } from "~/server/shared/result";

import type { ChangeMemberRoleCommand } from "../contracts";
import type { MemberWriteDeps } from "../ports";
import { authorizeMemberManagement } from "./authorize-member-management";

// Changing a role revokes the member's live sessions: their permission set
// changes immediately rather than lingering until the next login.
export async function changeMemberRole(
  ctx: AppContext,
  deps: MemberWriteDeps,
  command: ChangeMemberRoleCommand,
): Promise<Result<void, DomainError>> {
  const target = await authorizeMemberManagement(
    ctx,
    deps.users,
    command.userId,
  );
  if (isErr(target)) return target;

  if (!canAssignRole(ctx.actor.role, command.role)) {
    return Err(fail("role_not_assignable"));
  }

  await deps.users.updateRole(command.userId, {
    role: command.role,
    executive_category:
      command.role === "executive" ? command.executiveCategory : null,
  });
  await deps.sessions.revokeAllForUser(command.userId);

  return Ok(undefined);
}
