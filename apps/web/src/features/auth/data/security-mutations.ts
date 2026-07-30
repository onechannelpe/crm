import { action, json } from "@solidjs/router";

import { getUserLoginRetryReport } from "~/actions/admin/auth-security.action";
import {
  acknowledgeRecoveryCodes,
  regenerateRecoveryCodes,
} from "~/actions/auth/recovery-codes.action";
import {
  changePassword,
  disableTotp,
  removeAllPasskeys,
} from "~/actions/settings/security.action";
import { meQuery } from "~/features/auth/data/queries/me.query";
import { recoveryCodesStatusQuery } from "~/features/auth/data/queries/recovery-codes.query";

const SECURITY_STATUS_KEYS = [meQuery.key, recoveryCodesStatusQuery.key];

export const removeAllPasskeysMutation = action(
  async () =>
    json(await removeAllPasskeys(), { revalidate: SECURITY_STATUS_KEYS }),
  "settingsRemoveAllPasskeys",
);

export const disableTotpMutation = action(
  async () => json(await disableTotp(), { revalidate: SECURITY_STATUS_KEYS }),
  "settingsDisableTotp",
);

export const regenerateRecoveryCodesMutation = action(
  async () =>
    json(await regenerateRecoveryCodes(), {
      revalidate: SECURITY_STATUS_KEYS,
    }),
  "settingsRegenerateRecoveryCodes",
);

export const acknowledgeRecoveryCodesMutation = action(
  async () =>
    json(await acknowledgeRecoveryCodes(), {
      revalidate: SECURITY_STATUS_KEYS,
    }),
  "settingsAcknowledgeRecoveryCodes",
);

export const changePasswordMutation = action(
  (currentPassword: string, newPassword: string) =>
    changePassword(currentPassword, newPassword),
  "settingsChangePassword",
);

export const loginRetryReportMutation = action(
  (email: string) => getUserLoginRetryReport(email),
  "settingsLoginRetryReport",
);
