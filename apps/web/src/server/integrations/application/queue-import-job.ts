import { JOB_CHANNELS } from "~/lib/job-queue/channels";
import { publishJob } from "~/lib/redis/publisher";
import type { DomainError } from "~/server/shared/domain-error";
import { type Result, Ok } from "~/server/shared/result";

import type { JobBlobStore } from "../job-blob-store";
import type { IntegrationJobsPort } from "../types";

export async function queueImportJobUseCase(input: {
  type: "import_status" | "import_prioridad";
  actorId: number;
  fileName: string;
  bytes: Uint8Array;
  jobs: IntegrationJobsPort;
  blobStore: JobBlobStore;
}): Promise<Result<{ jobId: number }, DomainError>> {
  const jobId = await input.jobs.insert({
    type: input.type,
    status: "PENDING",
    requested_by_user_id: input.actorId,
    file_path: null,
    max_attempts: 3,
    created_at: Date.now(),
  });

  const key = `import-${jobId}-${input.fileName}`;
  await input.blobStore.put(key, input.bytes);
  await input.jobs.setFilePath(jobId, key);

  await publishJob(JOB_CHANNELS.CRM_IMPORT, jobId);

  return Ok({ jobId });
}
