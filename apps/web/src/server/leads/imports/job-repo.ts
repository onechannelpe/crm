import type {
  IntegrationJobCompletion,
  IntegrationJobRow,
  IntegrationJobsPort,
} from "~/server/integrations/types";

const LEAD_IMPORT_TYPES = ["import_status", "import_prioridad"] as const;

export async function claimPendingLeadImportJobs(
  jobs: IntegrationJobsPort,
  leaseMs: number,
  workerId: string,
  batchSize: number,
): Promise<IntegrationJobRow[]> {
  return jobs.claimPending(leaseMs, workerId, batchSize, [
    ...LEAD_IMPORT_TYPES,
  ]);
}

export function markLeadImportCompleted(
  jobs: IntegrationJobsPort,
  jobId: number,
  result: IntegrationJobCompletion,
) {
  return jobs.markCompleted(jobId, result);
}

export function scheduleLeadImportRetry(
  jobs: IntegrationJobsPort,
  jobId: number,
  availableAt: number,
) {
  return jobs.scheduleRetry(jobId, availableAt);
}

export function markLeadImportFailed(
  jobs: IntegrationJobsPort,
  jobId: number,
  errorMessage: string,
) {
  return jobs.markFailed(jobId, errorMessage);
}

export function updateLeadImportProgress(
  jobs: IntegrationJobsPort,
  jobId: number,
  progress: { rowsTotal?: number; rowsApplied?: number; rowsFailed?: number },
) {
  return jobs.updateProgress(jobId, progress);
}
