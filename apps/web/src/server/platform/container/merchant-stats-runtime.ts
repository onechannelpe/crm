import { createMerchantStatsRuntime } from "~/server/merchant-stats/infrastructure/runtime";

import { getFilesRuntime } from "./files-runtime";
import { infra } from "./infra";
import { memo } from "./memo";

export const getMerchantStatsRuntime = memo(() =>
  createMerchantStatsRuntime({
    db: infra.db,
    now: infra.now,
    files: getFilesRuntime(),
  }),
);
