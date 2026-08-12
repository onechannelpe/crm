import { auditEntityId } from "~/domain/audit/entity";
import { canImpersonateMember } from "~/domain/auth/access/member-management";
import { fail, type DomainError } from "~/domain/errors";
import type { UserId } from "~/domain/ids";
import type { EventsWriter } from "~/server/event-logs/events-repo";
import type { AppContext } from "~/server/platform/action/context";
import type { UsersRepo } from "~/server/users/repos-users";
import { Err, isErr, Ok, type Result } from "~/shared/result";

import type { SessionAuthenticator, SessionIssuer } from "./session.service";

export interface ImpersonationDeps {
  sessionIssuer: Pick<SessionIssuer, "establish">;
  sessionAuthenticator: Pick<SessionAuthenticator, "revoke">;
  users: UsersRepo;
  events: EventsWriter;
}

// Impersonation mints a fresh session that acts as the target while recording
// the administrator's id on the session row.
export async function startImpersonation(
  ctx: AppContext,
  deps: ImpersonationDeps,
  command: { userId: UserId },
): Promise<Result<{ token: string }, DomainError>> {
  if (command.userId === ctx.actor.userId) {
    return Err(fail("cannot_manage_self"));
  }

  const target = await deps.users.findById(command.userId);
  if (!target || target.branch_id !== ctx.actor.branchId) {
    return Err(fail("user_not_found"));
  }
  if (!canImpersonateMember(ctx.actor.role, target.role) || !target.is_active) {
    return Err(fail("cannot_impersonate"));
  }

  const issued = await deps.sessionIssuer.establish(
    {
      user: {
        id: target.id,
        branch_id: target.branch_id,
        role: target.role,
        onboarding_completed_at: target.onboarding_completed_at,
      },
      sessionClass: "app",
      request: { ipAddress: ctx.ipAddress, userAgent: ctx.userAgent },
      primaryAuthMethod: ctx.actor.primaryAuthMethod,
      strongAuthMethod: null,
      strongAuthAt: null,
      impersonatorUserId: ctx.actor.userId,
    },
    ctx,
  );
  if (isErr(issued)) {
    return issued;
  }

  await deps.events.append({
    type: "user.impersonation_started",
    entityType: "user",
    entityId: auditEntityId("user", target.id),
    actorUserId: ctx.actor.userId,
    subjectUserId: target.id,
    occurredAt: ctx.operationAt,
  });

  return Ok({ token: issued.value.token });
}

export async function stopImpersonation(
  ctx: AppContext,
  deps: ImpersonationDeps,
): Promise<Result<void, DomainError>> {
  const impersonatorUserId = ctx.actor.impersonatorUserId;
  if (impersonatorUserId === null) {
    return Err(fail("not_impersonating"));
  }

  await deps.sessionAuthenticator.revoke(ctx.actor.id);

  await deps.events.append({
    type: "user.impersonation_stopped",
    entityType: "user",
    entityId: auditEntityId("user", ctx.actor.userId),
    actorUserId: impersonatorUserId,
    subjectUserId: ctx.actor.userId,
    occurredAt: ctx.operationAt,
  });

  return Ok(undefined);
}
