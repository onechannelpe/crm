import { auditEntityId } from "~/domain/audit/entity";
import { canDeleteMember } from "~/domain/auth/access/member-management";
import { fail, type DomainError } from "~/domain/errors";
import { revokeUserAccess } from "~/server/auth/session/revoke-user-access";
import type { AppContext } from "~/server/platform/action/context";
import { Err, isErr, Ok, type Result } from "~/shared/result";

import type { MemberIdCommand } from "../contracts";
import type { MemberWriteDeps } from "../ports";
import { authorizeMemberManagement } from "./authorize-member-management";

// Deleting a member is only permitted once their book of business is empty, so
// active leads are never silently orphaned. Callers reassign the leads first
// (lead:reassign) and then retry the deletion.
export async function deleteMember(
  ctx: AppContext,
  deps: MemberWriteDeps,
  command: MemberIdCommand,
): Promise<Result<void, DomainError>> {
  return deps.lifecycle.run(async (tx) => {
    const target = await authorizeMemberManagement(
      ctx,
      tx.users,
      command.userId,
    );
    if (isErr(target)) return target;

    if ((await tx.workload.countActiveLeads(command.userId)) > 0) {
      return Err(fail("member_has_active_leads"));
    }

    if (!canDeleteMember(ctx.actor.role, target.value.role)) {
      return Err(fail("cannot_manage_member"));
    }

    await revokeUserAccess(tx, command.userId, ctx.operationAt);
    await tx.events.append({
      type: "member_deleted",
      entityType: "user",
      entityId: auditEntityId("user", command.userId),
      actorUserId: ctx.actor.userId,
      subjectUserId: command.userId,
      occurredAt: ctx.operationAt,
    });
    await tx.users.deleteById(command.userId);
    return Ok(undefined);
  });
}
