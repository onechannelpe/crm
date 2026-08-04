import { auditEntityId } from "~/domain/audit/entity";
import { type DomainError } from "~/domain/errors";
import { appDayRange } from "~/domain/time/app-time";
import type { AppContext } from "~/server/platform/action/context";
import { isErr, Ok, type Result } from "~/shared/result";

import type { UpdateMemberExpiryCommand } from "../contracts";
import type { MemberWriteDeps } from "../ports";
import { authorizeMemberManagement } from "./authorize-member-management";

// Sets the automatic-deactivation date. The existing expiry cron deactivates
// the member when this date passes; clearing it (null) removes the schedule.
export async function updateMemberExpiry(
  ctx: AppContext,
  deps: MemberWriteDeps,
  command: UpdateMemberExpiryCommand,
): Promise<Result<void, DomainError>> {
  return deps.lifecycle.run(async (tx) => {
    const target = await authorizeMemberManagement(
      ctx,
      tx.users,
      command.userId,
    );
    if (isErr(target)) return target;

    const expiresAt = command.expiresOn
      ? appDayRange(command.expiresOn).endExclusive
      : null;
    await tx.users.updateExpiry(command.userId, expiresAt);
    await tx.events.append({
      type: "member_expiry_updated",
      entityType: "user",
      entityId: auditEntityId("user", command.userId),
      actorUserId: ctx.actor.userId,
      subjectUserId: command.userId,
      payload: { expiresAt: expiresAt?.toISOString() ?? null },
      occurredAt: ctx.operationAt,
    });
    return Ok(undefined);
  });
}
