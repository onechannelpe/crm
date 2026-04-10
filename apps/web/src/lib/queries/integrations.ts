import { query } from "@solidjs/router";

import { listIntegrationJobs } from "~/actions/integrations/imports";

export const integrationJobsQuery = query(
  (limit: number) => listIntegrationJobs({ limit }),
  "integrationJobs",
);
