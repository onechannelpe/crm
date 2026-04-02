import type { DomainError } from "~/server/shared/domain-error";
import { type Result, Ok } from "~/server/shared/result";

import { integrationRuntime } from "../infrastructure/runtime";

export async function queueExportJobUseCase(input: {
  actorId: number;
}): Promise<Result<{ jobId: number }, DomainError>> {
  const jobId = await integrationRuntime.jobs.insert({
    type: "export",
    status: "PENDING",
    user_id: input.actorId,
    file_path: null,
    created_at: Date.now(),
  });
  return Ok({ jobId });
}
