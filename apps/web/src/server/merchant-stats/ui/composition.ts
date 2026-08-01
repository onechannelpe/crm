import "server-only";
import { composeFiles } from "~/server/files/ui/composition";
import { createMerchantStatsRuntime } from "~/server/merchant-stats/infrastructure/runtime";
import { serverInfrastructure } from "~/server/platform/composition/infrastructure";

export function composeMerchantStats() {
  return createMerchantStatsRuntime({
    db: serverInfrastructure.db,
    files: composeFiles(),
  });
}
