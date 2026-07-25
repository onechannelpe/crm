"use server";

import {
  acknowledgeRecoverySetup,
  regenerateRecoverySetup,
} from "~/server/auth/recovery/recovery-setup";
import { setSessionCookie } from "~/server/auth/session/cookies";
import { runAction } from "~/server/platform/action";
import { getServerRuntime } from "~/server/platform/container";
import { Ok } from "~/shared/result";

export async function getRecoveryCodesStatus(): Promise<{
  hasActiveSet: boolean;
  total: number;
  unused: number;
  acknowledged: boolean;
}> {
  return runAction({
    name: "auth.recovery.status",
    access: { kind: "session" },

    execute: async ({ actor }) => {
      const recoveryCodes =
        getServerRuntime().auth.setup.repos.userRecoveryCodes;

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
  const result = await runAction({
    name: "auth.recovery.regenerate",
    access: { kind: "session" },

    execute: (ctx) =>
      regenerateRecoverySetup(ctx, getServerRuntime().auth.setup),
  });

  setSessionCookie(result.sessionToken);

  return {
    recoveryCodes: result.recoveryCodes,
  };
}

export async function acknowledgeRecoveryCodes(): Promise<{
  redirectTo: string;
}> {
  const result = await runAction({
    name: "auth.recovery.acknowledge",
    access: { kind: "session" },

    execute: (ctx) =>
      acknowledgeRecoverySetup(ctx, getServerRuntime().auth.setup),
  });

  setSessionCookie(result.sessionToken);

  return {
    redirectTo: result.redirectTo,
  };
}
