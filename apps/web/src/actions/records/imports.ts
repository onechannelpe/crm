"use server";

import { randomUUID } from "node:crypto";

import type {
  RecordImportProgressEvent,
  RecordImportType,
} from "~/features/records-imports/contracts";
import type { Role } from "~/lib/auth/access/rbac";
import { maxUploadBytesForFilePurpose } from "~/server/files/validators";
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
import type { BranchId, UserId } from "~/server/shared/ids";
import { IntegrationJobId } from "~/server/shared/ids";
import { parseObject, validationFail } from "~/server/shared/parsing";
import { Err, Ok, type Result } from "~/server/shared/result";

const IMPORT_JOB_MAX_ATTEMPTS = 3;

type ImportUpload = {
  file: File;
  extension: "csv" | "xlsx";
};

function getExtension(filename: string): string | null {
  const dot = filename.lastIndexOf(".");

  if (dot === -1) {
    return null;
  }

  return filename.slice(dot + 1).toLowerCase() || null;
}

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

  if (file.size > maxUploadBytesForFilePurpose("integration_import")) {
    return Err(fail("file_too_large"));
  }

  return Ok({ file, extension });
}

async function getAuthorizedRecordImportJob(
  actor: {
    userId: UserId;
    branchId: BranchId;
    role: Role;
  },
  jobId: IntegrationJobId,
): Promise<IntegrationJobRow> {
  const { integration } = getServerRuntime().integrations;
  const job = await integration.jobs.findById(jobId);

  if (
    !job ||
    (job.type !== "import_status" && job.type !== "import_prioridad")
  ) {
    throwDomain(fail("import_job_not_found"));
  }

  const canAccess = await canAccessRecordImportJob(actor, job, integration);

  if (!canAccess) {
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

    audit: ({ file }) => ({
      fileName: file.name,
      fileSize: file.size,
    }),

    execute: async (ctx, { file, extension }) => {
      const runtime = getServerRuntime();
      const { storage } = runtime.files;
      const { integration } = runtime.integrations;
      const buffer = await file.arrayBuffer();

      let parsedImport: ReturnType<typeof parseImportFile>;

      try {
        parsedImport = parseImportFile(buffer, extension);
      } catch (error) {
        throwDomain(
          invalid({
            code: "invalid_import_file",
            details: error instanceof Error ? error.message : error,
          }),
        );
      }

      const { importType, validRows, invalidRows } = parsedImport;
      const rowsTotal = validRows.length + invalidRows.length;
      const storageKey = `imports/${randomUUID()}.json`;
      const storagePayload = new TextEncoder().encode(
        JSON.stringify({ validRows, invalidRows }),
      );

      await storage.putBytes(storageKey, storagePayload);

      const job = await integration.jobs.insert({
        type: importType,
        requested_by_user_id: ctx.actor.userId,
        file_path: storageKey,
        rows_total: rowsTotal,
        max_attempts: IMPORT_JOB_MAX_ATTEMPTS,
        created_at: ctx.now(),
      });

      publishRecordImportProgress(buildRecordImportProgressEvent(job));

      return Ok({
        jobId: job.id,
        importType,
        rowsTotal,
      });
    },
  });
}

// Fallback when the progress stream is unavailable.
export async function getRecordImportProgress(
  rawJobId: string,
): Promise<RecordImportProgressEvent> {
  return runAction({
    name: "records.import.progress",
    access: { kind: "permission", permission: "integration:manage" },

    parse: () =>
      parseObject({ jobId: rawJobId }, validationFail, (reader) => ({
        jobId: reader.id("jobId", IntegrationJobId),
      })),

    audit: ({ jobId }) => ({ jobId }),

    execute: async (ctx, { jobId }) => {
      const job = await getAuthorizedRecordImportJob(ctx.actor, jobId);

      return Ok(buildRecordImportProgressEvent(job));
    },
  });
}
