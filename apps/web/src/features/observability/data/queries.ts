import { query } from "@solidjs/router";

import { getObservabilitySnapshot } from "~/actions/admin/observability.action";

export const observabilitySnapshotQuery = query(
  getObservabilitySnapshot,
  "observabilitySnapshot",
);
