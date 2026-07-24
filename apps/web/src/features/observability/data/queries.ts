import { query } from "@solidjs/router";

import { getObservabilitySnapshot } from "~/actions/admin/observability";

export const observabilitySnapshotQuery = query(
  getObservabilitySnapshot,
  "observabilitySnapshot",
);
