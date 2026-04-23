"use server";

import { notFoundError, validationError } from "~/lib/app-errors";
import type { Role } from "~/lib/auth/access/rbac";
import { JOB_CHANNELS } from "~/lib/job-queue/channels";
import { publishJob } from "~/lib/redis/publisher";
import { requestArtifact } from "~/server/files/service/request-artifact";
import { uploadArtifactFile } from "~/server/files/service/upload-artifact";
import { maxUploadBytesForArtifactType } from "~/server/files/validators";
import type { IntegrationJobRow } from "~/server/integrations/types";
import {
  detectRecordImportFile,
  canAccessRecordImportJob,
} from "~/server/records/imports/api";
import {
  buildRecordImportProgressEvent,
  publishRecordImportProgress,
} from "~/server/records/imports/progress-events";
import { getServerRuntime } from "~/server/runtime";
import { runAction } from "~/server/shared/action-runtime";
import { isErr, Ok } from "~/server/shared/result";

function isCsvFile(file: File): boolean {
  return file.name.toLowerCase().endsWith(".csv");
}

async function getAuthorizedRecordImportJob(
  actor: { userId: number; branchId: number; role: Role },
  jobId: string,
): Promise<IntegrationJobRow> {
  const job =
    await getServerRuntime().integrations.integration.jobs.findById(jobId);
  if (
    !job ||
    (job.type !== "import_status" && job.type !== "import_prioridad")
  ) {
    throw notFoundError("Import job not found");
  }

  const authorized = await canAccessRecordImportJob(
    actor,
    job,
    getServerRuntime().integrations.integration,
  );
  if (!authorized) {
    throw notFoundError("Import job not found");
  }

  return job;
}

export async function uploadRecordImportFile(formData: FormData): Promise<{
  artifactId: string;
  jobId: string;
  importType: "import_status" | "import_prioridad";
  rowsTotal: number;
}> {
  const file = formData.get("file");

  if (!(file instanceof File)) {
    throw validationError("file is required");
  }
  if (!isCsvFile(file)) {
    throw validationError("only .csv files are supported");
  }
  if (file.size > maxUploadBytesForArtifactType("integration_import")) {
    throw validationError("file_too_large");
  }

  return runAction({
    actionName: "records.import.upload",
    access: { kind: "permission", permission: "integration:manage" },
    input: {
      fileName: file.name,
      fileSize: file.size,
    },
    execute: async (ctx) => {
      const { repo, storage, syncExecutor } = getServerRuntime().files;
      const { integration } = getServerRuntime().integrations;
      const headerChunkText = await file.slice(0, 64 * 1024).text();
      const detection = detectRecordImportFile({ fileText: headerChunkText });
      if (!detection.ok) {
        throw validationError(detection.message);
      }

      const artifactResult = await requestArtifact(
        ctx,
        {
          artifactType: "integration_import",
          executionMode: "async",
          workflowContext: { importType: detection.importType },
        },
        { repo, storage, syncExecutor },
      );
      if (isErr(artifactResult)) {
        return artifactResult;
      }

      const artifactId = artifactResult.value.artifact.id;

      const uploadResult = await uploadArtifactFile(
        ctx,
        artifactId,
        { name: file.name, sizeBytes: file.size, stream: file.stream() },
        { repo, storage },
      );
      if (isErr(uploadResult)) {
        return uploadResult;
      }

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
        type: detection.importType,
        status: "PENDING",
        requested_by_user_id: ctx.actor.userId,
        file_path: fileAsset.storageKey,
        max_attempts: 3,
        created_at: ctx.now(),
      });

      await integration.jobs.updateProgress(jobId, {
        rowsTotal: 0,
        rowsApplied: 0,
        rowsFailed: 0,
      });

      await publishRecordImportProgress(
        buildRecordImportProgressEvent({
          job: {
            id: jobId,
            type: detection.importType,
            status: "PENDING",
            rows_applied: 0,
            rows_failed: 0,
            rows_total: 0,
            error_message: null,
          },
        }),
      );

      await publishJob(JOB_CHANNELS.RECORDS_IMPORT, jobId);

      return Ok({
        artifactId,
        jobId,
        importType: detection.importType,
        rowsTotal: 0,
      });
    },
  });
}

export async function getRecordImportJob(
  jobId: string,
): Promise<IntegrationJobRow> {
  return runAction({
    actionName: "records.import.get_job",
    access: { kind: "permission", permission: "integration:manage" },
    input: { jobId },
    execute: async (ctx) => {
      const job = await getAuthorizedRecordImportJob(ctx.actor, jobId);
      return Ok(job);
    },
  });
}
