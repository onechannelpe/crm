import { renderPasswordResetEmail } from "@crm/notifications";

import { hashPassword } from "~/lib/auth/password/password";
import {
  generatePasswordResetToken,
  hashPasswordResetToken,
  isValidPasswordResetTokenFormat,
} from "~/lib/auth/password/reset-tokens";

import type { PasswordResetContext } from "../infrastructure/password-reset-context";

const TOKEN_TTL_MS = 60 * 60 * 1000;
const MAX_REQUESTS_PER_HOUR = 3;

export type RequestPasswordResetResult =
  | { ok: true }
  | { ok: false; code: "rate_limited" | "email_required" };

export async function requestPasswordReset(input: {
  email: string;
  origin: string;
  deps: PasswordResetContext;
}): Promise<RequestPasswordResetResult> {
  const email = input.email.trim().toLowerCase();
  if (!email) {
    return { ok: false, code: "email_required" };
  }

  const now = Date.now();
  const user = await input.deps.repos.users.findByEmail(email);
  if (!user || !user.is_active) {
    return { ok: true };
  }

  const recentCount =
    await input.deps.repos.passwordResetTokens.countRecentForUser(
      user.id,
      now - TOKEN_TTL_MS,
    );
  if (recentCount >= MAX_REQUESTS_PER_HOUR) {
    return { ok: false, code: "rate_limited" };
  }

  const token = generatePasswordResetToken();
  await input.deps.repos.passwordResetTokens.create({
    user_id: user.id,
    token_hash: hashPasswordResetToken(token),
    expires_at: now + TOKEN_TTL_MS,
    created_at: now,
  });

  const { html, text } = renderPasswordResetEmail({
    fullName: [user.names, user.first_surname].filter(Boolean).join(" "),
    resetUrl: `${input.origin}/reset-password?token=${token}`,
  });

  await input.deps.notificationSender.send({
    channel: "email",
    to: user.email,
    subject: "Restablecer contraseña",
    html,
    text,
  });

  return { ok: true };
}

export type ResetPasswordResult =
  | { ok: true }
  | {
      ok: false;
      code: "invalid_token" | "password_mismatch" | "password_too_short";
    };

export async function resetPassword(input: {
  token: string;
  password: string;
  confirmPassword: string;
  deps: Pick<PasswordResetContext, "repos">;
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

  await input.deps.repos.passwordResetTokens.expireAllForUser(
    record.user_id,
    now,
  );
  await input.deps.repos.users.updatePassword(
    record.user_id,
    await hashPassword(input.password),
  );

  return { ok: true };
}
