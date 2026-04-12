import { action, json } from "@solidjs/router";

import { requestSearchEnrichment } from "~/actions/client-search/enrichment";
import { enrichmentStatusQuery } from "~/lib/queries/enrichment";

export const requestEnrichmentMutation = action(
  async (documentType: string, documentValue: string) => {
    const jobId = await requestSearchEnrichment(documentType, documentValue);
    return json(
      { jobId },
      {
        revalidate: enrichmentStatusQuery.keyFor(documentType, documentValue),
      },
    );
  },
  "requestEnrichment",
);
