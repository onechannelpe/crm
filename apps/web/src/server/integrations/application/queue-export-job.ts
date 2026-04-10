import { JOB_CHANNELS } from "~/lib/job-queue/channels";
import { createLogger } from "~/lib/observability/logger";
import { publishJob } from "~/lib/redis/publisher";
import type { DomainError } from "~/server/shared/domain-error";
import { type Result, Ok } from "~/server/shared/result";

import type { IntegrationJobsPort } from "../types";

const logger = createLogger("integration-export-queue");

export async function queueExportJobUseCase(input: {
  actorId: number;
  jobs: IntegrationJobsPort;
}): Promise<Result<{ jobId: number }, DomainError>> {
  logger.info("integration_export_queue_requested", {
    actorId: input.actorId,
  });

  const jobId = await input.jobs.insert({
    type: "export",
    status: "PENDING",
    requested_by_user_id: input.actorId,
    file_path: null,
    max_attempts: 3,
    created_at: Date.now(),
  });

  await publishJob(JOB_CHANNELS.CRM_EXPORT, jobId);

  logger.info("integration_export_queue_created", {
    actorId: input.actorId,
    jobId,
  });

  return Ok({ jobId });
}
