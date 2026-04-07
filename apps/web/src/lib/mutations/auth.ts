import { action } from "@solidjs/router";

import {
  passkeyStart,
  passwordLogin,
  totpLogin,
  type TotpLoginSubmissionResult,
} from "~/actions/auth/login";
import {
  requestPasswordReset,
  resetPassword,
} from "~/actions/auth/reset-password";
import type {
  PasskeyStartSubmissionResult,
  PasswordLoginSubmissionResult,
  RequestPasswordResetResult,
  ResetPasswordResult,
} from "~/server/auth/application/contracts";

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
  async (formData: FormData): Promise<TotpLoginSubmissionResult> =>
    totpLogin(formData),
  "totpLogin",
);

export const requestPasswordResetMutation = action(
  async (formData: FormData): Promise<RequestPasswordResetResult> =>
    requestPasswordReset(formData),
  "requestPasswordReset",
);

export const resetPasswordMutation = action(
  async (formData: FormData): Promise<ResetPasswordResult> =>
    resetPassword(formData),
  "resetPassword",
);
