import { db } from "~/lib/db/db";
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
    user_id: input.actorId,
    file_path: null,
    created_at: Date.now(),
  });

  const key = `import-${jobId}-${input.fileName}`;
  await integrationJobBlobStore.put(key, input.bytes);
  await runtime.jobs.setFilePath(jobId, key);

  return Ok({ jobId });
}
