import {
  generatePasswordResetToken,
  hashPasswordResetToken,
} from "~/lib/auth/password/reset-tokens";
import { fail, type DomainError } from "~/server/shared/domain-error";
import { Err, Ok, type Result } from "~/server/shared/result";

import type { PasswordResetRequestContext } from "../infrastructure/password-reset-context";

const TOKEN_TTL_MS = 60 * 60 * 1000;
const MAX_REQUESTS_PER_HOUR = 3;

export async function requestPasswordReset(input: {
  email: string;
  origin: string;
  deps: PasswordResetRequestContext;
}): Promise<Result<{ ok: true }, DomainError>> {
  const email = input.email.trim().toLowerCase();
  if (!email) {
    return Err(fail("email_required"));
  }

  const now = new Date();
  const user = await input.deps.repos.users.findByEmail(email);
  if (!user || !user.is_active) {
    return Ok({ ok: true });
  }

  const recentCount =
    await input.deps.repos.passwordResetTokens.countRecentForUser(
      user.id,
      new Date(now.getTime() - TOKEN_TTL_MS),
    );
  if (recentCount >= MAX_REQUESTS_PER_HOUR) {
    return Err(fail("rate_limited"));
  }

  const token = generatePasswordResetToken();
  await input.deps.repos.passwordResetTokens.create({
    user_id: user.id,
    token_hash: hashPasswordResetToken(token),
    expires_at: new Date(now.getTime() + TOKEN_TTL_MS),
    created_at: now,
  });

  const sent = await input.deps.messaging.sendPasswordResetEmail({
    to: user.email,
    params: {
      fullName: [user.names, user.first_surname].filter(Boolean).join(" "),
      resetUrl: `${input.origin}/reset-password?token=${token}`,
    },
  });
  if (!sent.ok) {
    throw new Error(sent.error.message);
  }

  return Ok({ ok: true });
}
