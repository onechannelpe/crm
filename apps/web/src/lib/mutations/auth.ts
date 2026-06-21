import { action } from "@solidjs/router";
import { redirect } from "@solidjs/router";

import type {
  PasskeyStartSubmissionResult,
  PasswordLoginSubmissionResult,
} from "~/actions/auth/contracts";
import {
  acceptInvitePasswordStep,
  type AcceptInviteResult,
} from "~/actions/auth/invite";
import { passkeyStart, passwordLogin, totpLogin } from "~/actions/auth/login";
import {
  requestPasswordReset,
  resetPassword,
} from "~/actions/auth/reset-password";

export const passwordLoginMutation = action(
  async (formData: FormData): Promise<PasswordLoginSubmissionResult> =>
    passwordLogin(formData),
  "passwordLogin",
);

export const passkeyStartMutation = action(
  async (formData: FormData): Promise<PasskeyStartSubmissionResult> =>
    passkeyStart(formData),
  "passkeyStart",
);

export const totpLoginMutation = action(
  async (formData: FormData): Promise<void> => totpLogin(formData),
  "totpLogin",
);

export const requestPasswordResetMutation = action(
  async (formData: FormData): Promise<{ ok: true }> =>
    requestPasswordReset(formData),
  "requestPasswordReset",
);

export const resetPasswordMutation = action(
  async (formData: FormData): Promise<{ ok: true }> => resetPassword(formData),
  "resetPassword",
);

export const acceptInvitePasswordMutation = action(
  async (formData: FormData): Promise<AcceptInviteResult> => {
    const token = formData.get("token");
    const password = formData.get("password");
    const confirmPassword = formData.get("confirmPassword");
    const result = await acceptInvitePasswordStep({
      token: typeof token === "string" ? token : "",
      password: typeof password === "string" ? password : "",
      confirmPassword:
        typeof confirmPassword === "string" ? confirmPassword : undefined,
    });
    if (result.ok) {
      throw redirect(result.redirectTo);
    }
    return result;
  },
  "acceptInvitePassword",
);
