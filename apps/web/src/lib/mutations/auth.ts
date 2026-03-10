import { action } from "@solidjs/router";

import {
  passkeyStart,
  passwordLogin,
  totpLogin,
  type PasskeyStartSubmissionResult,
  type PasswordLoginSubmissionResult,
  type TotpLoginSubmissionResult,
} from "~/actions/auth/login";

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
