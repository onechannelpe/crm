import { getApplication } from "~/server/composition/application";
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

    execute: async ({ actor }) =>
      Ok(await getApplication().auth.recoveryCodes.status(actor.userId)),
  });
}
