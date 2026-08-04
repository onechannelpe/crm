import { auditEntityId } from "~/domain/audit/entity";
import { type DomainError } from "~/domain/errors";
import type { UserId } from "~/domain/ids";
import { revokeUserAccess } from "~/server/auth/session/revoke-user-access";
import type { AppContext } from "~/server/platform/action/context";
import { isErr, Ok, type Result } from "~/shared/result";

import type { MemberWriteDeps } from "../ports";
import { authorizeMemberManagement } from "./authorize-member-management";

// Deactivation revokes live sessions so access ends immediately; the row is
// kept so the member's history and assignments remain intact.
export async function deactivateMember(
  ctx: AppContext,
  deps: MemberWriteDeps,
  userId: UserId,
): Promise<Result<void, DomainError>> {
  return deps.lifecycle.run(async (tx) => {
    const target = await authorizeMemberManagement(ctx, tx.users, userId);
    if (isErr(target)) return target;

    await tx.users.setActive(userId, false);
    await revokeUserAccess(tx, userId, ctx.operationAt);
    await tx.events.append({
      type: "member_deactivated",
      entityType: "user",
      entityId: auditEntityId("user", userId),
      actorUserId: ctx.actor.userId,
      subjectUserId: userId,
      occurredAt: ctx.operationAt,
    });
    return Ok(undefined);
  });
}
