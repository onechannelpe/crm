import { query } from "@solidjs/router";

import { setSessionCookie } from "~/server/auth/session/cookies";
import { getRecoveryCodesStatus } from "~/server/auth/ui/recovery-codes";
import { executeSessionServerFunction } from "~/server/platform/action";
import { application } from "~/server/platform/composition/application";

export async function regenerateRecoveryCodes(): Promise<{
  recoveryCodes: string[];
}> {
  "use server";

  const result = await executeSessionServerFunction({
    name: "auth.recovery.regenerate",
    access: { kind: "session" },
    execute: (context) => application.auth.recoveryCodes.regenerate(context),
  });

  setSessionCookie(result.sessionToken);
  return { recoveryCodes: result.recoveryCodes };
}

export async function acknowledgeRecoveryCodes(): Promise<{
  redirectTo: string;
}> {
  "use server";

  const result = await executeSessionServerFunction({
    name: "auth.recovery.acknowledge",
    access: { kind: "session" },
    execute: (context) => application.auth.recoveryCodes.acknowledge(context),
  });

  setSessionCookie(result.sessionToken);
  return { redirectTo: result.redirectTo };
}

export const recoveryCodesStatusQuery = query(async () => {
  "use server";
  return getRecoveryCodesStatus();
}, "auth.recovery-codes.status");
