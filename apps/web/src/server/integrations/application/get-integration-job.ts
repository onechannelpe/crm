import type { IntegrationJobsPort } from "../types";

export function getIntegrationJobQuery(
  jobId: string,
  jobs: IntegrationJobsPort,
) {
  return jobs.findById(jobId);
}
