import { integrationRuntime } from "../infrastructure/runtime";

export function listIntegrationJobsQuery(input: {
  limit?: number;
  offset?: number;
}) {
  return integrationRuntime.jobs.list(
    Math.min(input.limit ?? 50, 200),
    input.offset ?? 0,
  );
}
