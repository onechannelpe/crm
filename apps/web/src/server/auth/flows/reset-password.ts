import { fail, type DomainError } from "~/domain/errors";
import { hashPassword } from "~/server/auth/password/password";
import {
  hashPasswordResetToken,
  isValidPasswordResetTokenFormat,
} from "~/server/auth/password/reset-tokens";
import { Err, Ok, type Result } from "~/shared/result";

import type { PasswordResetRequestContext } from "../infrastructure/password-reset-context";

export async function resetPassword(input: {
  token: string;
  password: string;
  confirmPassword: string;
  deps: PasswordResetRequestContext;
}): Promise<Result<{ ok: true }, DomainError>> {
  if (!isValidPasswordResetTokenFormat(input.token)) {
    return Err(fail("invalid_token"));
  }
  if (input.password.length < 8) {
    return Err(fail("password_too_short"));
  }
  if (input.password !== input.confirmPassword) {
    return Err(fail("password_mismatch"));
  }

  const now = new Date();
  const record = await input.deps.repos.passwordResetTokens.findValidByHash(
    hashPasswordResetToken(input.token),
    now,
  );
  if (!record) {
    return Err(fail("invalid_token"));
  }

  const passwordHash = await hashPassword(input.password);
  await input.deps.uow.run(async (repos) => {
    await repos.passwordResetTokens.expireAllForUser(record.user_id, now);
    await repos.users.updatePassword(record.user_id, passwordHash);
    return Ok(undefined);
  });

  return Ok({ ok: true });
}
