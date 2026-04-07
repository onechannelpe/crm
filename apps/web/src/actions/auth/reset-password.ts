"use server";

import { getRequestEvent } from "solid-js/web";

import type {
  RequestPasswordResetResult,
  ResetPasswordResult,
} from "~/actions/auth/contracts";
import { getRequestPublicOrigin } from "~/lib/http/public-origin";
import {
  requestPasswordReset as requestPasswordResetService,
  resetPassword as resetPasswordService,
} from "~/server/auth/application/password-reset";
import { createPasswordResetContext } from "~/server/auth/infrastructure/password-reset-context";

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
    deps: createPasswordResetContext(),
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
    repos: createPasswordResetContext().repos,
    token,
    password,
    confirmPassword,
  });
}
