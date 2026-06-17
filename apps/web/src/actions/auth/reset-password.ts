"use server";

import { getRequestContext } from "~/lib/http/request-context";
import { requestPasswordReset as requestPasswordResetService } from "~/server/auth/flows/request-password-reset";
import { resetPassword as resetPasswordService } from "~/server/auth/flows/reset-password";
import { getServerRuntime } from "~/server/runtime";
import { runPublicAction } from "~/server/shared/action-runtime";
import { throwDomain } from "~/server/shared/domain-error";
import { isErr } from "~/server/shared/result";

export async function requestPasswordReset(
  formData: FormData,
): Promise<{ ok: true }> {
  const rawEmail = formData.get("email");
  const email = typeof rawEmail === "string" ? rawEmail : "";

  const origin = getRequestContext().publicOrigin;

  return runPublicAction(async () => {
    const result = await requestPasswordResetService({
      deps: getServerRuntime().auth.passwordReset,
      email,
      origin,
    });

    if (isErr(result)) {
      throwDomain(result.error);
    }

    return result.value;
  });
}

export async function resetPassword(formData: FormData): Promise<{ ok: true }> {
  const rawToken = formData.get("token");
  const rawPassword = formData.get("password");
  const rawConfirm = formData.get("confirmPassword");

  const token = typeof rawToken === "string" ? rawToken.trim() : "";
  const password = typeof rawPassword === "string" ? rawPassword : "";
  const confirmPassword = typeof rawConfirm === "string" ? rawConfirm : "";

  return runPublicAction(async () => {
    const result = await resetPasswordService({
      deps: getServerRuntime().auth.passwordReset,
      token,
      password,
      confirmPassword,
    });

    if (isErr(result)) {
      throwDomain(result.error);
    }

    return result.value;
  });
}
