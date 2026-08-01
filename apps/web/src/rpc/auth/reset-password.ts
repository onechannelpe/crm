import { throwDomain } from "~/server/platform/action/domain-error";
import { application } from "~/server/platform/composition/application";
import {
  getRequestContext,
  getRequestInstant,
} from "~/server/platform/http/request-context";
import { isErr } from "~/shared/result";

export async function requestPasswordReset(
  formData: FormData,
): Promise<{ ok: true }> {
  "use server";

  const rawEmail = formData.get("email");
  const email = typeof rawEmail === "string" ? rawEmail : "";

  const request = getRequestContext();

  const result = await application.auth.passwordReset.request({
    email,
    origin: request.publicOrigin,
    requestedAt: request.startedAt,
  });

  if (isErr(result)) {
    throwDomain(result.error);
  }

  return result.value;
}

export async function resetPassword(formData: FormData): Promise<{ ok: true }> {
  "use server";

  const rawToken = formData.get("token");
  const rawPassword = formData.get("password");
  const rawConfirm = formData.get("confirmPassword");

  const token = typeof rawToken === "string" ? rawToken.trim() : "";
  const password = typeof rawPassword === "string" ? rawPassword : "";
  const confirmPassword = typeof rawConfirm === "string" ? rawConfirm : "";

  const result = await application.auth.passwordReset.reset({
    token,
    password,
    confirmPassword,
    resetAt: getRequestInstant(),
  });

  if (isErr(result)) {
    throwDomain(result.error);
  }

  return result.value;
}
