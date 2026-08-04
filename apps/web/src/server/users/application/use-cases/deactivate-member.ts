import { auditEntityId } from "~/domain/audit/entity";
import { type DomainError } from "~/domain/errors";
import { revokeUserAccess } from "~/server/auth/session/revoke-user-access";
import type { AppContext } from "~/server/platform/action/context";
import { isErr, Ok, type Result } from "~/shared/result";

import type { MemberIdCommand } from "../contracts";
import type { MemberWriteDeps } from "../ports";
import { authorizeMemberManagement } from "./authorize-member-management";

// Deactivation revokes live sessions so access ends immediately; the row is
// kept so the member's history and assignments remain intact.
export async function deactivateMember(
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

    await tx.users.setActive(command.userId, false);
    await revokeUserAccess(tx, command.userId, ctx.operationAt);
    await tx.events.append({
      type: "member_deactivated",
      entityType: "user",
      entityId: auditEntityId("user", command.userId),
      actorUserId: ctx.actor.userId,
      subjectUserId: command.userId,
      occurredAt: ctx.operationAt,
    });
    return Ok(undefined);
  });
}
