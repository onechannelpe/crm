import type { IntegrationJobsPort } from "../types";

export function listIntegrationJobsQuery(
  input: { limit?: number; offset?: number },
  jobs: IntegrationJobsPort,
) {
  return jobs.list(Math.min(input.limit ?? 50, 200), input.offset ?? 0);
}
