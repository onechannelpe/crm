import { auditEntityId } from "~/domain/audit/entity";
import { type DomainError } from "~/domain/errors";
import type { AppContext } from "~/server/platform/action/context";
import { isErr, Ok, type Result } from "~/shared/result";

import type { MemberIdCommand } from "../contracts";
import type { MemberWriteDeps } from "../ports";
import { authorizeMemberManagement } from "./authorize-member-management";

export async function reactivateMember(
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

    await tx.users.setActive(command.userId, true);
    await tx.events.append({
      type: "member_reactivated",
      entityType: "user",
      entityId: auditEntityId("user", command.userId),
      actorUserId: ctx.actor.userId,
      subjectUserId: command.userId,
      occurredAt: ctx.operationAt,
    });
    return Ok(undefined);
  });
}
