import { db } from "~/lib/db/db";
import { JOB_CHANNELS } from "~/lib/job-queue/channels";
import { publishJob } from "~/lib/redis/publisher";
import type { DomainError } from "~/server/shared/domain-error";
import { type Result, Ok } from "~/server/shared/result";

import {
  createIntegrationRuntime,
  integrationJobBlobStore,
} from "../infrastructure/runtime";

export async function queueImportJobUseCase(input: {
  type: "import_status" | "import_prioridad";
  actorId: number;
  fileName: string;
  bytes: Uint8Array;
}): Promise<Result<{ jobId: number }, DomainError>> {
  const runtime = createIntegrationRuntime(db);
  const jobId = await runtime.jobs.insert({
    type: input.type,
    status: "PENDING",
    requested_by_user_id: input.actorId,
    file_path: null,
    max_attempts: 3,
    created_at: Date.now(),
  });

  const key = `import-${jobId}-${input.fileName}`;
  await integrationJobBlobStore.put(key, input.bytes);
  await runtime.jobs.setFilePath(jobId, key);

  await publishJob(JOB_CHANNELS.CRM_IMPORT, jobId);

  return Ok({ jobId });
}
