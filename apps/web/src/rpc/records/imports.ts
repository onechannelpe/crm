import { randomUUID } from "node:crypto";

import type { RecordImportType } from "~/contracts/records/imports";
import { fail, invalid, type DomainError } from "~/domain/errors";
import { composeFiles } from "~/server/files/ui/composition";
import { maxUploadBytesForFilePurpose } from "~/server/files/validators";
import { composeIntegrations } from "~/server/integrations/ui/composition";
import { executeSessionServerFunction } from "~/server/platform/action";
import { throwDomain } from "~/server/platform/action/domain-error";
import { parseImportFile } from "~/server/records/imports/intake";
import {
  buildRecordImportProgressEvent,
  publishRecordImportProgress,
} from "~/server/records/imports/progress-events";
import { Err, Ok, type Result } from "~/shared/result";

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

export async function uploadRecordImportFile(formData: FormData): Promise<{
  jobId: string;
  importType: RecordImportType;
  rowsTotal: number;
}> {
  "use server";

  return executeSessionServerFunction({
    name: "records.import.upload",
    access: { kind: "permission", permission: "integration:manage" },

    parse: () => parseImportUpload(formData),

    audit: ({ file }) => ({
      fileName: file.name,
      fileSize: file.size,
    }),

    execute: async (ctx, { file, extension }) => {
      const { storage } = composeFiles();
      const { integration } = composeIntegrations();
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
        created_at: ctx.operationAt,
      });

      publishRecordImportProgress(
        integration.executor,
        buildRecordImportProgressEvent(job),
      );

      return Ok({ jobId: job.id, importType, rowsTotal });
    },
  });
}
