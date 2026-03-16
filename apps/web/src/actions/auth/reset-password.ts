"use server";

import { renderPasswordResetEmail } from "@crm/notifications";
import { getRequestEvent } from "solid-js/web";

import { hashPassword } from "~/lib/auth/password/password";
import {
  generatePasswordResetToken,
  hashPasswordResetToken,
  isValidPasswordResetTokenFormat,
} from "~/lib/auth/password/reset-tokens";
import { repos, notificationSender } from "~/server/shared/context";

const TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour
const MAX_REQUESTS_PER_HOUR = 3;

function getOrigin(): string {
  const event = getRequestEvent();
  if (!event?.request.url) return "";
  return new URL(event.request.url).origin;
}

export type RequestPasswordResetResult =
  | { ok: true }
  | { ok: false; code: "rate_limited" | "email_required" };

export async function requestPasswordReset(
  formData: FormData,
): Promise<RequestPasswordResetResult> {
  const rawEmail = formData.get("email");
  const email =
    typeof rawEmail === "string" ? rawEmail.trim().toLowerCase() : "";

  if (!email) {
    return { ok: false, code: "email_required" };
  }

  const now = Date.now();
  const user = await repos.users.findByEmail(email);

  // Always return ok to avoid leaking whether email exists
  if (!user || !user.is_active) {
    return { ok: true };
  }

  // Rate-limit: max requests per user per hour
  const windowStart = now - TOKEN_TTL_MS;
  const recentCount = await repos.passwordResetTokens.countRecentForUser(
    user.id,
    windowStart,
  );
  if (recentCount >= MAX_REQUESTS_PER_HOUR) {
    return { ok: false, code: "rate_limited" };
  }

  const token = generatePasswordResetToken();
  const tokenHash = hashPasswordResetToken(token);
  const expiresAt = now + TOKEN_TTL_MS;

  await repos.passwordResetTokens.create({
    user_id: user.id,
    token_hash: tokenHash,
    expires_at: expiresAt,
    created_at: now,
  });

  const resetUrl = `${getOrigin()}/reset-password?token=${token}`;
  const fullName = [user.names, user.first_surname].filter(Boolean).join(" ");

  const { html, text } = renderPasswordResetEmail({
    fullName,
    resetUrl,
  });

  await notificationSender.send({
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

export async function resetPassword(
  formData: FormData,
): Promise<ResetPasswordResult> {
  const rawToken = formData.get("token");
  const rawPassword = formData.get("password");
  const rawConfirm = formData.get("confirmPassword");
  const token = typeof rawToken === "string" ? rawToken.trim() : "";
  const password = typeof rawPassword === "string" ? rawPassword : "";
  const confirmPassword = typeof rawConfirm === "string" ? rawConfirm : "";

  if (!isValidPasswordResetTokenFormat(token)) {
    return { ok: false, code: "invalid_token" };
  }

  if (password.length < 8) {
    return { ok: false, code: "password_too_short" };
  }

  if (password !== confirmPassword) {
    return { ok: false, code: "password_mismatch" };
  }

  const now = Date.now();
  const tokenHash = hashPasswordResetToken(token);
  const record = await repos.passwordResetTokens.findValidByHash(
    tokenHash,
    now,
  );

  if (!record) {
    return { ok: false, code: "invalid_token" };
  }

  const passwordHash = await hashPassword(password);

  // Expire all pending tokens for this user, then update password
  await repos.passwordResetTokens.expireAllForUser(record.user_id, now);
  await repos.users.updatePassword(record.user_id, passwordHash);

  return { ok: true };
}
