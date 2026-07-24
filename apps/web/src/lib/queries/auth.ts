import { query } from "@solidjs/router";

import { getRecoveryCodesStatus } from "~/actions/auth/recovery-codes";
import { getLoginFlow, getMe } from "~/actions/auth/session";

export const loginFlowQuery = query(getLoginFlow, "auth.loginFlow");

export const meQuery = query(getMe, "auth.me");

export const recoveryCodesStatusQuery = query(
  getRecoveryCodesStatus,
  "auth.recoveryCodesStatus",
);
