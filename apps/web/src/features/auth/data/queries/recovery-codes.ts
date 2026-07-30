import { query } from "@solidjs/router";

import { getRecoveryCodesStatus } from "~/actions/auth/recovery-codes";

export const recoveryCodesStatusQuery = query(
  getRecoveryCodesStatus,
  "auth.recoveryCodesStatus",
);
