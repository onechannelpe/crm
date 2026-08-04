import { auditEntityId } from "~/domain/audit/entity";
import { fail, type DomainError } from "~/domain/errors";
import { hashPassword } from "~/server/auth/password/password";
import {
  hashPasswordResetToken,
  isValidPasswordResetTokenFormat,
} from "~/server/auth/password/reset-tokens";
import type { OperationContext } from "~/server/platform/operation/context";
import { Err, isErr, Ok, type Result } from "~/shared/result";

import type { PasswordResetRequestContext } from "../infrastructure/password-reset-context";
import { revokeUserAccess } from "../session/revoke-user-access";

export async function resetPassword(
  input: {
    token: string;
    password: string;
    confirmPassword: string;
    deps: PasswordResetRequestContext;
  },
  operation: OperationContext,
): Promise<Result<{ ok: true }, DomainError>> {
  if (!isValidPasswordResetTokenFormat(input.token)) {
    return Err(fail("invalid_token"));
  }
  if (input.password.length < 8) {
    return Err(fail("password_too_short"));
  }
  if (input.password !== input.confirmPassword) {
    return Err(fail("password_mismatch"));
  }

  const now = operation.operationAt;
  const record = await input.deps.repos.passwordResetTokens.findValidByHash(
    hashPasswordResetToken(input.token),
    now,
  );
  if (!record) {
    return Err(fail("invalid_token"));
  }

  const passwordHash = await hashPassword(input.password);
  const reset = await input.deps.uow.run(async (repos) => {
    await repos.passwordResetTokens.expireAllForUser(record.user_id, now);
    await repos.users.updatePassword(record.user_id, passwordHash);
    await revokeUserAccess(repos, record.user_id, now);
    await repos.events.append({
      type: "password_reset",
      entityType: "user",
      entityId: auditEntityId("user", record.user_id),
      subjectUserId: record.user_id,
      occurredAt: now,
    });
    return Ok(undefined);
  });
  if (isErr(reset)) return reset;

  return Ok({ ok: true });
}
