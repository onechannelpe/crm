"use server";

import { notFoundError, validationError } from "~/lib/app-errors";
import { getIntegrationJobQuery } from "~/server/integrations/application/get-integration-job";
import { listIntegrationJobsQuery } from "~/server/integrations/application/list-integration-jobs";
import { queueImportJobUseCase } from "~/server/integrations/application/queue-import-job";
import { serverRuntime } from "~/server/runtime";
import { runAction } from "~/server/shared/action-runtime";
import { Ok } from "~/server/shared/result";

type ImportType = "import_status" | "import_prioridad";

function isImportType(v: string): v is ImportType {
  return v === "import_status" || v === "import_prioridad";
}

export async function uploadImportFile(
  formData: FormData,
): Promise<{ jobId: number }> {
  const file = formData.get("file");
  const type = formData.get("type");

  if (!(file instanceof File)) throw validationError("file is required");
  if (typeof type !== "string" || !isImportType(type)) {
    throw validationError("type must be import_status or import_prioridad");
  }
  if (!file.name.toLowerCase().endsWith(".csv")) {
    throw validationError("Only CSV files are accepted");
  }

  const bytes = new Uint8Array(await file.arrayBuffer());

  return runAction({
    actionName: "integration.upload_import",
    access: { kind: "permission", permission: "integration:manage" },
    input: {},
    execute: (ctx) =>
      queueImportJobUseCase({
        type,
        actorId: ctx.actor.userId,
        fileName: file.name,
        bytes,
        jobs: serverRuntime.integrations.integration.jobs,
        blobStore: serverRuntime.integrations.blobStore,
      }),
  });
}

export async function getImportJob(jobId: number) {
  return runAction({
    actionName: "integration.get_import_job",
    access: { kind: "permission", permission: "integration:manage" },
    input: { jobId },
    execute: async () => {
      const job = await getIntegrationJobQuery(
        jobId,
        serverRuntime.integrations.integration.jobs,
      );
      if (!job) throw notFoundError("Import job not found");
      return Ok(job);
    },
  });
}

export async function listIntegrationJobs(filters: {
  limit?: number;
  offset?: number;
}) {
  return runAction({
    actionName: "integration.list_jobs",
    access: { kind: "permission", permission: "integration:manage" },
    input: {},
    execute: async () =>
      Ok(
        await listIntegrationJobsQuery(
          filters,
          serverRuntime.integrations.integration.jobs,
        ),
      ),
  });
}
