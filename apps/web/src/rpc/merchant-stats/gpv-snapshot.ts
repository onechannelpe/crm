import { query } from "@solidjs/router";

import { getGpvSnapshot } from "~/server/merchant-stats/ui/imports";

export const gpvSnapshotQuery = query(async (snapshotId: string) => {
  "use server";
  return getGpvSnapshot(snapshotId);
}, "merchant-stats.gpv-snapshot");
