import "server-only";

import {
  acknowledgeRecoverySetup,
  regenerateRecoverySetup,
} from "~/server/auth/recovery/recovery-setup";
import { setSessionCookie } from "~/server/auth/session/cookies";
import { composeAuth } from "~/server/auth/ui/composition";
import { executeSessionServerFunction } from "~/server/platform/action";
import { Ok } from "~/shared/result";

export async function getRecoveryCodesStatus(): Promise<{
  hasActiveSet: boolean;
  total: number;
  unused: number;
  acknowledged: boolean;
}> {

  return executeSessionServerFunction({
    name: "auth.recovery.status",
    access: { kind: "session" },

    execute: async ({ actor }) => {
      const recoveryCodes = composeAuth().setup.repos.userRecoveryCodes;

      const active = await recoveryCodes.getActiveSet(actor.userId);

      return Ok({
        hasActiveSet: active !== null,
        total: active?.total ?? 0,
        unused: active?.unused ?? 0,
        acknowledged: active?.acknowledgedAt != null,
      });
    },
  });
}

export async function regenerateRecoveryCodes(): Promise<{
  recoveryCodes: string[];
}> {

  const result = await executeSessionServerFunction({
    name: "auth.recovery.regenerate",
    access: { kind: "session" },

    execute: (ctx) => regenerateRecoverySetup(ctx, composeAuth().setup),
  });

  setSessionCookie(result.sessionToken);

  return {
    recoveryCodes: result.recoveryCodes,
  };
}

export async function acknowledgeRecoveryCodes(): Promise<{
  redirectTo: string;
}> {

  const result = await executeSessionServerFunction({
    name: "auth.recovery.acknowledge",
    access: { kind: "session" },

    execute: (ctx) => acknowledgeRecoverySetup(ctx, composeAuth().setup),
  });

  setSessionCookie(result.sessionToken);

  return {
    redirectTo: result.redirectTo,
  };
}
