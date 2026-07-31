import { query } from "@solidjs/router";

import {
  acknowledgeRecoverySetup,
  regenerateRecoverySetup,
} from "~/server/auth/recovery/recovery-setup";
import { setSessionCookie } from "~/server/auth/session/cookies";
import { composeAuth } from "~/server/auth/ui/composition";
import { getRecoveryCodesStatus } from "~/server/auth/ui/recovery-codes";
import { executeSessionServerFunction } from "~/server/platform/action";

export async function regenerateRecoveryCodes(): Promise<{
  recoveryCodes: string[];
}> {
  "use server";

  const result = await executeSessionServerFunction({
    name: "auth.recovery.regenerate",
    access: { kind: "session" },
    execute: (context) => regenerateRecoverySetup(context, composeAuth().setup),
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
    execute: (context) =>
      acknowledgeRecoverySetup(context, composeAuth().setup),
  });

  setSessionCookie(result.sessionToken);
  return { redirectTo: result.redirectTo };
}

export const recoveryCodesStatusQuery = query(async () => {
  "use server";
  return getRecoveryCodesStatus();
}, "auth.recovery-codes.status");
