"use server";

import { randomUUID } from "node:crypto";

import type { RecordImportType } from "~/features/records-imports/contracts";
import type { Role } from "~/lib/auth/access/rbac";
import { JOB_CHANNELS } from "~/lib/job-queue/channels";
import { maxUploadBytesForArtifactType } from "~/server/files/validators";
import type { IntegrationJobRow } from "~/server/integrations/types";
import { runAction } from "~/server/platform/action";
import { getServerRuntime } from "~/server/platform/container";
import { canAccessRecordImportJob } from "~/server/records/imports/api";
import { parseImportFile } from "~/server/records/imports/intake";
import {
  buildRecordImportProgressEvent,
  publishRecordImportProgress,
} from "~/server/records/imports/progress-events";
import {
  fail,
  invalid,
  type DomainError,
  throwDomain,
} from "~/server/shared/domain-error";
import { parseObject, validationFail } from "~/server/shared/parsing";
import { Err, Ok, type Result } from "~/server/shared/result";

const IMPORT_JOB_MAX_ATTEMPTS = 3;

function getExtension(filename: string): string | null {
  const dot = filename.lastIndexOf(".");

  if (dot === -1) {
    return null;
  }

  return filename.slice(dot + 1).toLowerCase() || null;
}

type ImportUpload = {
  file: File;
  extension: "csv" | "xlsx";
};

function parseImportUpload(
  formData: FormData,
): Result<ImportUpload, DomainError> {
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return Err(fail("file_required"));
  }

  const extension = getExtension(file.name);

  if (extension !== "csv" && extension !== "xlsx") {
    return Err(fail("unsupported_file_type"));
  }

  if (file.size > maxUploadBytesForArtifactType("integration_import")) {
    return Err(fail("file_too_large"));
  }

  return Ok({ file, extension });
}

async function getAuthorizedRecordImportJob(
  actor: {
    userId: number;
    branchId: number;
    role: Role;
  },
  jobId: string,
): Promise<IntegrationJobRow> {
  const { integration } = getServerRuntime().integrations;

  const job = await integration.jobs.findById(jobId);

  if (
    !job ||
    (job.type !== "import_status" && job.type !== "import_prioridad")
  ) {
    throwDomain(fail("import_job_not_found"));
  }

  const authorized = await canAccessRecordImportJob(actor, job, integration);

  if (!authorized) {
    throwDomain(fail("import_job_not_found"));
  }

  return job;
}

export async function uploadRecordImportFile(formData: FormData): Promise<{
  jobId: string;
  importType: RecordImportType;
  rowsTotal: number;
}> {
  return runAction({
    name: "records.import.upload",
    access: { kind: "permission", permission: "integration:manage" },
    parse: () => parseImportUpload(formData),
    audit: ({ file }) => ({ fileName: file.name, fileSize: file.size }),

    execute: async (ctx, { file, extension }) => {
      const runtime = getServerRuntime();
      const { storage } = runtime.files;
      const { integration } = runtime.integrations;

      const buffer = await file.arrayBuffer();

      let parsed;

      try {
        parsed = parseImportFile(buffer, extension);
      } catch (err) {
        throwDomain(
          invalid({
            code: "invalid_import_file",
            details: err instanceof Error ? err.message : err,
          }),
        );
      }

      const { importType, validRows, invalidRows } = parsed;
      const rowsTotal = validRows.length + invalidRows.length;
      const storageKey = `imports/${randomUUID()}.json`;
      const storagePayload = new TextEncoder().encode(
        JSON.stringify({ validRows, invalidRows }),
      );

      await storage.putBytes(storageKey, storagePayload);

      const jobId = await integration.jobs.insert({
        type: importType,
        status: "PENDING",
        requested_by_user_id: ctx.actor.userId,
        file_path: storageKey,
        max_attempts: IMPORT_JOB_MAX_ATTEMPTS,
        created_at: ctx.now(),
      });

      await integration.jobs.updateProgress(jobId, {
        rowsTotal,
        rowsApplied: 0,
        rowsFailed: 0,
      });

      publishRecordImportProgress(
        buildRecordImportProgressEvent({
          job: {
            id: jobId,
            type: importType,
            status: "PENDING",
            rows_applied: 0,
            rows_failed: 0,
            rows_total: rowsTotal,
            error_message: null,
          },
        }),
      );

      runtime.queueDoorbell.wake(JOB_CHANNELS.RECORDS_IMPORT, jobId);

      return Ok({ jobId, importType, rowsTotal });
    },
  });
}

export async function getRecordImportJob(
  rawJobId: string,
): Promise<IntegrationJobRow> {
  return runAction({
    name: "records.import.get_job",
    access: { kind: "permission", permission: "integration:manage" },

    parse: () =>
      parseObject({ jobId: rawJobId }, validationFail, (r) => ({
        jobId: r.str("jobId"),
      })),

    audit: (query) => ({ jobId: query.jobId }),

    execute: async (ctx, query) => {
      const job = await getAuthorizedRecordImportJob(ctx.actor, query.jobId);

      return Ok(job);
    },
  });
}
