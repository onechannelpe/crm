"use server";

import { getRequestEvent } from "solid-js/web";

import type {
  RequestPasswordResetResult,
  ResetPasswordResult,
} from "~/actions/auth/contracts";
import { getRequestPublicOrigin } from "~/lib/http/public-origin";
import { requestPasswordReset as requestPasswordResetService } from "~/server/auth/application/commands/request-password-reset";
import { resetPassword as resetPasswordService } from "~/server/auth/application/commands/reset-password";
import { getServerRuntime } from "~/server/runtime";

function getOrigin(): string {
  const event = getRequestEvent();
  if (!event?.request) return "";
  return getRequestPublicOrigin(event.request);
}

export async function requestPasswordReset(
  formData: FormData,
): Promise<RequestPasswordResetResult> {
  const rawEmail = formData.get("email");
  return requestPasswordResetService({
    deps: getServerRuntime().auth.passwordReset,
    email: typeof rawEmail === "string" ? rawEmail : "",
    origin: getOrigin(),
  });
}

export async function resetPassword(
  formData: FormData,
): Promise<ResetPasswordResult> {
  const rawToken = formData.get("token");
  const rawPassword = formData.get("password");
  const rawConfirm = formData.get("confirmPassword");
  const token = typeof rawToken === "string" ? rawToken.trim() : "";
  const password = typeof rawPassword === "string" ? rawPassword : "";
  const confirmPassword = typeof rawConfirm === "string" ? rawConfirm : "";

  return resetPasswordService({
    repos: getServerRuntime().auth.passwordReset.repos,
    token,
    password,
    confirmPassword,
  });
}
