import type { IntegrationJobsPort } from "../types";

export function getIntegrationJobQuery(
  jobId: number,
  jobs: IntegrationJobsPort,
) {
  return jobs.findById(jobId);
}
