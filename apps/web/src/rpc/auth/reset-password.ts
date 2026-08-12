import { getApplication } from "~/server/composition/application";
import { throwDomain } from "~/server/platform/action/domain-error";
import {
  getRequestContext,
  getRequestOperation,
} from "~/server/platform/http/request-context-storage";
import { isErr } from "~/shared/result";

export async function requestPasswordReset(
  formData: FormData,
): Promise<{ ok: true }> {
  "use server";

  const rawEmail = formData.get("email");
  const email = typeof rawEmail === "string" ? rawEmail : "";
  const { publicOrigin } = getRequestContext();

  const result = await getApplication().auth.passwordReset.request(
    { email, origin: publicOrigin },
    getRequestOperation(),
  );

  if (isErr(result)) {
    throwDomain(result.error);
  }

  return result.value;
}

export async function resetPassword(formData: FormData): Promise<{ ok: true }> {
  "use server";

  const rawToken = formData.get("token");
  const rawPassword = formData.get("password");
  const rawConfirmPassword = formData.get("confirmPassword");

  const token = typeof rawToken === "string" ? rawToken.trim() : "";
  const password = typeof rawPassword === "string" ? rawPassword : "";
  const confirmPassword =
    typeof rawConfirmPassword === "string" ? rawConfirmPassword : "";

  const result = await getApplication().auth.passwordReset.reset(
    { token, password, confirmPassword },
    getRequestOperation(),
  );

  if (isErr(result)) {
    throwDomain(result.error);
  }

  return result.value;
}
