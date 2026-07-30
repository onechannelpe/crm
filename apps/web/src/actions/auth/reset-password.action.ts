import { requestPasswordReset as requestPasswordResetService } from "~/server/auth/flows/request-password-reset";
import { resetPassword as resetPasswordService } from "~/server/auth/flows/reset-password";
import { executePublicServerFunction } from "~/server/platform/action";
import { throwDomain } from "~/server/platform/action/domain-error";
import { getAuthRuntime } from "~/server/platform/container/auth-runtime";
import { getRequestContext } from "~/server/platform/http/request-context";
import { isErr } from "~/shared/result";

export async function requestPasswordReset(
  formData: FormData,
): Promise<{ ok: true }> {
  "use server";

  const rawEmail = formData.get("email");
  const email = typeof rawEmail === "string" ? rawEmail : "";

  const origin = getRequestContext().publicOrigin;

  return executePublicServerFunction(async () => {
    const result = await requestPasswordResetService({
      deps: getAuthRuntime().passwordReset,
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
  "use server";

  const rawToken = formData.get("token");
  const rawPassword = formData.get("password");
  const rawConfirm = formData.get("confirmPassword");

  const token = typeof rawToken === "string" ? rawToken.trim() : "";
  const password = typeof rawPassword === "string" ? rawPassword : "";
  const confirmPassword = typeof rawConfirm === "string" ? rawConfirm : "";

  return executePublicServerFunction(async () => {
    const result = await resetPasswordService({
      deps: getAuthRuntime().passwordReset,
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
