import { query } from "@solidjs/router";

export const recoveryCodesStatusQuery = query(async () => {
  "use server";

  const { getRecoveryCodesStatus } =
    await import("~/actions/auth/recovery-codes.action");
  return getRecoveryCodesStatus();
}, "auth.recovery-codes.status");
