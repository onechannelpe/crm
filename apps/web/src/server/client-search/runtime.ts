import { db } from "~/lib/db/db";

import { createSearchEnrichmentService } from "./enrichment-service";
import { createSearchEnrichmentRepo } from "./repos-enrichment";

const searchEnrichmentService = createSearchEnrichmentService({
  searchEnrichment: createSearchEnrichmentRepo(db),
});

export function getClientSearchRuntime() {
  return { searchEnrichmentService };
}
