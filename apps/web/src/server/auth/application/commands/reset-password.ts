import { hashPassword } from "~/lib/auth/password/password";
import {
  hashPasswordResetToken,
  isValidPasswordResetTokenFormat,
} from "~/lib/auth/password/reset-tokens";

import type { PasswordResetRequestContext } from "../../infrastructure/password-reset-context";
import type { ResetPasswordResult } from "../contracts";

export async function resetPassword(input: {
  token: string;
  password: string;
  confirmPassword: string;
  deps: PasswordResetRequestContext;
}): Promise<ResetPasswordResult> {
  if (!isValidPasswordResetTokenFormat(input.token)) {
    return { ok: false, code: "invalid_token" };
  }
  if (input.password.length < 8) {
    return { ok: false, code: "password_too_short" };
  }
  if (input.password !== input.confirmPassword) {
    return { ok: false, code: "password_mismatch" };
  }

  const now = Date.now();
  const record = await input.deps.repos.passwordResetTokens.findValidByHash(
    hashPasswordResetToken(input.token),
    now,
  );
  if (!record) {
    return { ok: false, code: "invalid_token" };
  }

  const passwordHash = await hashPassword(input.password);
  await input.deps.runInRepositoryTransaction(async (repos) => {
    await repos.passwordResetTokens.expireAllForUser(record.user_id, now);
    await repos.users.updatePassword(record.user_id, passwordHash);
  });

  return { ok: true };
}
