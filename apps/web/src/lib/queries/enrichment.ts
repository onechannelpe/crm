import { query } from "@solidjs/router";

import { getSearchEnrichmentStatus } from "~/actions/client-search/enrichment";

export const enrichmentStatusQuery = query(
  (documentType: string, documentValue: string) =>
    getSearchEnrichmentStatus({ documentType, documentValue }),
  "enrichmentStatus",
);
