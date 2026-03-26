import type { DomainError } from "~/server/shared/domain-error";
import { pipelineRepos } from "~/server/shared/pipeline-runtime";
import { type Result, Ok } from "~/server/shared/result";

export async function queueExportJobUseCase(input: {
  actorId: number;
}): Promise<Result<{ jobId: number }, DomainError>> {
  const jobId = await pipelineRepos.integrationJobs.insert({
    type: "export",
    status: "PENDING",
    user_id: input.actorId,
    file_path: null,
    created_at: Date.now(),
  });
  return Ok({ jobId });
}
