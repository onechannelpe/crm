"use server";

import { getRequestEvent } from "solid-js/web";

import { getRequestPublicOrigin } from "~/lib/http/public-origin";
import {
  requestPasswordReset as requestPasswordResetService,
  resetPassword as resetPasswordService,
  type RequestPasswordResetResult,
  type ResetPasswordResult,
} from "~/server/auth/service-password-reset";

export type { RequestPasswordResetResult, ResetPasswordResult };

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
    token,
    password,
    confirmPassword,
  });
}
