import { query } from "@solidjs/router";

import { getObservabilitySnapshot } from "~/server/observability/ui/snapshot";

export const observabilitySnapshotQuery = query(
  async (params?: unknown) => {
    "use server";
    return getObservabilitySnapshot(params);
  },
  "observability.snapshot",
);
