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
