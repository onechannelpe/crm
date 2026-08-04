import { auditEntityId } from "~/domain/audit/entity";
import { type DomainError } from "~/domain/errors";
import type { UserId } from "~/domain/ids";
import type { AppContext } from "~/server/platform/action/context";
import { isErr, Ok, type Result } from "~/shared/result";

import type { MemberWriteDeps } from "../ports";
import { authorizeMemberManagement } from "./authorize-member-management";

export async function reactivateMember(
  ctx: AppContext,
  deps: MemberWriteDeps,
  userId: UserId,
): Promise<Result<void, DomainError>> {
  return deps.lifecycle.run(async (tx) => {
    const target = await authorizeMemberManagement(ctx, tx.users, userId);
    if (isErr(target)) return target;

    await tx.users.setActive(userId, true);
    await tx.events.append({
      type: "member_reactivated",
      entityType: "user",
      entityId: auditEntityId("user", userId),
      actorUserId: ctx.actor.userId,
      subjectUserId: userId,
      occurredAt: ctx.operationAt,
    });
    return Ok(undefined);
  });
}
