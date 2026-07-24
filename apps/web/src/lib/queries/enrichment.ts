import { query } from "@solidjs/router";

import { getSearchEnrichmentStatus } from "~/actions/client-search/enrichment";

export const enrichmentStatusQuery = query(
  getSearchEnrichmentStatus,
  "enrichmentStatus",
);
