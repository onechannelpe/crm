import { query } from "@solidjs/router";

import { getRecoveryCodesStatus } from "~/server/auth/ui/recovery-codes";

export const recoveryCodesStatusQuery = query(async () => {
  "use server";
  return getRecoveryCodesStatus();
}, "auth.recovery-codes.status");
