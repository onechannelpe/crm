import { auditEntityId } from "~/domain/audit/entity";
import { canAssignRole } from "~/domain/auth/access/rbac";
import { fail, type DomainError } from "~/domain/errors";
import { revokeUserAccess } from "~/server/auth/session/revoke-user-access";
import type { AppContext } from "~/server/platform/action/context";
import { Err, isErr, Ok, type Result } from "~/shared/result";

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
  return deps.lifecycle.run(async (tx) => {
    const target = await authorizeMemberManagement(
      ctx,
      tx.users,
      command.userId,
    );
    if (isErr(target)) {
      return target;
    }

    if (!canAssignRole(ctx.actor.role, command.role)) {
      return Err(fail("role_not_assignable"));
    }

    await tx.users.updateRole(command.userId, {
      role: command.role,
      executive_category:
        command.role === "executive" ? command.executiveCategory : null,
    });
    await revokeUserAccess(tx, command.userId, ctx.operationAt);
    await tx.events.append({
      type: "member_role_changed",
      entityType: "user",
      entityId: auditEntityId("user", command.userId),
      actorUserId: ctx.actor.userId,
      subjectUserId: command.userId,
      payload: { role: command.role },
      occurredAt: ctx.operationAt,
    });
    return Ok(undefined);
  });
}
