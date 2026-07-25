import type { IntegrationJobId } from "~/domain/ids";

import type { IntegrationJobsPort } from "../types";

export function getIntegrationJobQuery(
  jobId: IntegrationJobId,
  jobs: IntegrationJobsPort,
) {
  return jobs.findById(jobId);
}
