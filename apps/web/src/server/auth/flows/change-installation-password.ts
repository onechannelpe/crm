import { auditEntityId } from "~/domain/audit/entity";
import { fail, type DomainError } from "~/domain/errors";
import type { UserId } from "~/domain/ids";
import { hashPassword, verifyPassword } from "~/server/auth/password/password";
import type { OperationContext } from "~/server/platform/operation/context";
import { Err, isErr, Ok, type Result } from "~/shared/result";

import type { AuthSetupContext } from "../infrastructure/setup-context";
import { createSessionService } from "../session/session.service";

export async function changeInstallationPassword(
  deps: AuthSetupContext,
  input: {
    userId: UserId;
    currentSessionId: string;
    password: string;
    confirmPassword: string;
  },
  operation: OperationContext,
): Promise<Result<void, DomainError>> {
  if (input.password.length < 8) {
    return Err(fail("password_too_short"));
  }
  if (input.password !== input.confirmPassword) {
    return Err(fail("password_mismatch"));
  }

  const user = await deps.repos.users.findById(input.userId);
  if (!user) {
    return Err(fail("user_not_found"));
  }
  if (!user.password_change_required) {
    return Ok(undefined);
  }
  if (await verifyPassword(user.password_hash, input.password)) {
    return Err(fail("installation_password_must_change"));
  }

  const passwordHash = await hashPassword(input.password);

  const changed = await deps.uow.run(async (repos) => {
    await repos.users.replaceInstallationPassword(user.id, passwordHash);
    await createSessionService({
      sessions: repos.sessions,
      users: repos.users,
      events: repos.events,
    }).revokeOtherForUser(user.id, input.currentSessionId);
    await repos.events.append({
      type: "password_changed",
      entityType: "user",
      entityId: auditEntityId("user", user.id),
      actorUserId: user.id,
      occurredAt: operation.operationAt,
    });
    return Ok(undefined);
  });
  if (isErr(changed)) return changed;

  return Ok(undefined);
}
