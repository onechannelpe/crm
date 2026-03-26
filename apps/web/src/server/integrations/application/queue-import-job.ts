import { db } from "~/lib/db/db";
import type { DomainError } from "~/server/shared/domain-error";
import {
  createPipelineRepos,
  jobBlobStore,
} from "~/server/shared/pipeline-runtime";
import { type Result, Ok } from "~/server/shared/result";

export async function queueImportJobUseCase(input: {
  type: "import_status" | "import_prioridad";
  actorId: number;
  fileName: string;
  bytes: Uint8Array;
}): Promise<Result<{ jobId: number }, DomainError>> {
  const repos = createPipelineRepos(db);
  const jobId = await repos.integrationJobs.insert({
    type: input.type,
    status: "PENDING",
    user_id: input.actorId,
    file_path: null,
    created_at: Date.now(),
  });

  const key = `import-${jobId}-${input.fileName}`;
  await jobBlobStore.put(key, input.bytes);
  await repos.integrationJobs.setFilePath(jobId, key);

  return Ok({ jobId });
}
