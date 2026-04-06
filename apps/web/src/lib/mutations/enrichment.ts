import { action, json } from "@solidjs/router";

import { requestSearchEnrichment } from "~/actions/client-search/enrichment";
import { enrichmentStatusQuery } from "~/lib/queries/enrichment";

export const requestEnrichmentMutation = action(
  async (documentType: string, documentValue: string) => {
    const status = await requestSearchEnrichment(documentType, documentValue);
    return json(status, {
      revalidate: enrichmentStatusQuery.keyFor(documentType, documentValue),
    });
  },
  "requestEnrichment",
);
