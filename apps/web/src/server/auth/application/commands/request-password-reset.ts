import { renderPasswordResetEmail } from "@crm/notifications";

import {
  generatePasswordResetToken,
  hashPasswordResetToken,
} from "~/lib/auth/password/reset-tokens";

import type { PasswordResetRequestContext } from "../../infrastructure/password-reset-context";
import type { RequestPasswordResetResult } from "../contracts";

const TOKEN_TTL_MS = 60 * 60 * 1000;
const MAX_REQUESTS_PER_HOUR = 3;

export async function requestPasswordReset(input: {
  email: string;
  origin: string;
  deps: PasswordResetRequestContext;
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
