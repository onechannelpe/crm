"use server";

import { auditEntityId } from "~/domain/audit/entity";
import { canDeleteMember } from "~/domain/auth/access/member-management";
import { fail, type DomainError } from "~/domain/errors";
import type { UserId } from "~/domain/ids";
import { revokeUserAccess } from "~/server/auth/session/revoke-user-access";
import type { AppContext } from "~/server/platform/action/context";
import { Err, isErr, Ok, type Result } from "~/shared/result";

import type { MemberWriteDeps } from "../ports";
import { authorizeMemberManagement } from "./authorize-member-management";

export async function deleteMember(
  ctx: AppContext,
  deps: MemberWriteDeps,
  userId: UserId,
): Promise<Result<void, DomainError>> {
  return deps.lifecycle.run(async (tx) => {
    const target = await authorizeMemberManagement(ctx, tx.users, userId);
    if (isErr(target)) {
      return target;
    }

    if (!canDeleteMember(ctx.actor.role, target.value.role)) {
      return Err(fail("cannot_manage_member"));
    }

    if ((await tx.workload.countActiveLeads(userId)) > 0) {
      return Err(fail("member_has_active_leads"));
    }

    await revokeUserAccess(tx, userId, ctx.operationAt);

    await tx.events.append({
      type: "member_deleted",
      entityType: "user",
      entityId: auditEntityId("user", userId),
      actorUserId: ctx.actor.userId,
      subjectUserId: userId,
      occurredAt: ctx.operationAt,
    });

    await tx.users.deleteById(userId);

    return Ok(undefined);
  });
}
