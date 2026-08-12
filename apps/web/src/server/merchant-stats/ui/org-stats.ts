import type { RucMerchantStats } from "~/contracts/merchant-stats/views";
import { fail, type DomainError } from "~/domain/errors";
import { getApplication } from "~/server/composition/application";
import { executeSessionServerFunction } from "~/server/platform/action";
import { Err, Ok, type Result } from "~/shared/result";

export async function getMerchantStatsForRuc(
  rawRuc: string,
): Promise<RucMerchantStats> {
  return executeSessionServerFunction({
    name: "merchantStats.ruc.read",
    access: { kind: "permission", permission: "dashboards:read:own" },

    parse: (): Result<{ ruc: string }, DomainError> => {
      if (typeof rawRuc !== "string" || !/^\d{6,}$/.test(rawRuc)) {
        return Err(fail("invalid_ruc"));
      }

      return Ok({ ruc: rawRuc });
    },

    telemetry: ({ ruc }) => ({ ruc }),

    execute: ({ actor }, { ruc }) =>
      getApplication().merchantStats.executive.rucStats({
        ruc,
        role: actor.role,
        userId: actor.userId,
      }),
  });
}
