"use server";

import { validationError, notFoundError } from "~/lib/app-errors";
import { JOB_CHANNELS } from "~/lib/job-queue/channels";
import { publishJob } from "~/lib/redis/publisher";
import { requestArtifact, uploadArtifactFile } from "~/server/files/service";
import { getIntegrationJobQuery } from "~/server/integrations/application/get-integration-job";
import { listIntegrationJobsQuery } from "~/server/integrations/application/list-integration-jobs";
import { serverRuntime } from "~/server/runtime";
import { runAction } from "~/server/shared/action-runtime";
import { isErr, Ok } from "~/server/shared/result";

type ImportType = "import_status" | "import_prioridad";

function isImportType(v: string): v is ImportType {
  return v === "import_status" || v === "import_prioridad";
}

export async function uploadImportFile(
  formData: FormData,
): Promise<{ artifactId: number; jobId: number }> {
  const file = formData.get("file");
  const type = formData.get("type");

  if (!(file instanceof File)) throw validationError("file is required");
  if (typeof type !== "string" || !isImportType(type)) {
    throw validationError("type must be import_status or import_prioridad");
  }

  const bytes = new Uint8Array(await file.arrayBuffer());

  return runAction({
    actionName: "integration.upload_import",
    access: { kind: "permission", permission: "file:artifact:upload" },
    input: { type },
    execute: async (ctx) => {
      const { repo, storage, syncExecutor } = serverRuntime.files;
      const { integration } = serverRuntime.integrations;

      const artifactResult = await requestArtifact(
        ctx,
        {
          artifactType: "integration_import",
          executionMode: "async",
          workflowContext: { importType: type },
        },
        { repo, storage, syncExecutor },
      );
      if (isErr(artifactResult)) return artifactResult;

      const artifactId = artifactResult.value.artifact.id;

      const uploadResult = await uploadArtifactFile(
        ctx,
        artifactId,
        { name: file.name, bytes },
        { repo, storage },
      );
      if (isErr(uploadResult)) return uploadResult;

      const fileAsset = await repo.findFileAssetForArtifact(
        artifactId,
        "source_upload",
      );
      if (!fileAsset) {
        return {
          ok: false as const,
          error: {
            kind: "unexpected" as const,
            code: "file_asset_missing",
            message: "File asset missing after upload",
          },
        };
      }

      const jobId = await integration.jobs.insert({
        type,
        status: "PENDING",
        requested_by_user_id: ctx.actor.userId,
        file_path: fileAsset.storageKey,
        max_attempts: 3,
        created_at: ctx.now(),
      });

      await publishJob(JOB_CHANNELS.CRM_IMPORT, jobId);

      return Ok({ artifactId, jobId });
    },
  });
}

export async function getImportJob(jobId: number) {
  return runAction({
    actionName: "integration.get_import_job",
    access: { kind: "permission", permission: "file:artifact:read" },
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
    access: { kind: "permission", permission: "file:artifact:read" },
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
