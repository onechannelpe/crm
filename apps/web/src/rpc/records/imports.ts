import type { RecordImportType } from "~/contracts/records/imports";
import { fail, invalid, type DomainError } from "~/domain/errors";
import { application } from "~/server/composition/application";
import { maxUploadBytesForFilePurpose } from "~/server/files/validators";
import { executeSessionServerFunction } from "~/server/platform/action";
import { throwDomain } from "~/server/platform/action/domain-error";
import { parseImportFile } from "~/server/records/imports/intake";
import { Err, Ok, type Result } from "~/shared/result";

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

    telemetry: ({ file }) => ({
      fileName: file.name,
      fileSize: file.size,
    }),

    execute: async (ctx, { file, extension }) => {
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
      const storagePayload = new TextEncoder().encode(
        JSON.stringify({ validRows, invalidRows }),
      );

      const job = await application.integration.records.create({
        type: importType,
        requestedByUserId: ctx.actor.userId,
        rowsTotal,
        payload: storagePayload,
        createdAt: ctx.operationAt,
      });

      return Ok({ jobId: job.id, importType, rowsTotal });
    },
  });
}
