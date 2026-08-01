import "server-only";
import { executeSessionServerFunction } from "~/server/platform/action";
import { application } from "~/server/platform/composition/application";
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
      Ok(await application.auth.recoveryCodes.status(actor.userId)),
  });
}
