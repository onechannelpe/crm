import { integrationRuntime } from "../infrastructure/runtime";

export function getIntegrationJobQuery(jobId: number) {
  return integrationRuntime.jobs.findById(jobId);
}
