"use server";

import { notFoundError, validationError } from "~/lib/app-errors";
import { getIntegrationJobQuery } from "~/server/integrations/application/get-integration-job";
import { queueExportJobUseCase } from "~/server/integrations/application/queue-export-job";
import { serverRuntime } from "~/server/runtime";
import { runAction } from "~/server/shared/action-runtime";
import { Ok } from "~/server/shared/result";

export async function queueLeadExport(): Promise<{ jobId: number }> {
  return runAction({
    actionName: "integration.queue_export",
    access: { kind: "permission", permission: "integration:manage" },
    input: {},
    execute: (ctx) =>
      queueExportJobUseCase({
        actorId: ctx.actor.userId,
        jobs: serverRuntime.integrations.integration.jobs,
      }),
  });
}

export async function getExportJob(jobId: number) {
  return runAction({
    actionName: "integration.get_export_job",
    access: { kind: "permission", permission: "integration:manage" },
    input: { jobId },
    execute: async () => {
      const job = await getIntegrationJobQuery(
        jobId,
        serverRuntime.integrations.integration.jobs,
      );
      if (!job) throw notFoundError("Export job not found");
      return Ok(job);
    },
  });
}

export async function downloadExport(jobId: number): Promise<Uint8Array> {
  return runAction({
    actionName: "integration.download_export",
    access: { kind: "permission", permission: "integration:manage" },
    input: { jobId },
    execute: async () => {
      const { integration, blobStore } = serverRuntime.integrations;
      const job = await getIntegrationJobQuery(jobId, integration.jobs);
      if (!job) throw notFoundError("Export job not found");
      if (job.status !== "COMPLETED" || !job.file_path) {
        throw validationError("Export is not ready for download");
      }
      return Ok(await blobStore.get(job.file_path));
    },
  });
}
