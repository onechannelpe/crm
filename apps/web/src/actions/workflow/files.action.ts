import { ActionError, type WireError } from "~/contracts/errors";
import type { LeadRateRevisionFileView } from "~/contracts/workflow/results";
import { fail, invalid, type DomainError } from "~/domain/errors";
import {
  FileAssetId,
  WorkflowLeadId,
  WorkflowRateRevisionFileId,
} from "~/domain/ids";
import { executeSessionServerFunction } from "~/server/platform/action";
import {
  parseObject,
  validationFail,
} from "~/server/platform/action/input-reader";
import { getWorkflowRuntime } from "~/server/platform/container/workflow-runtime";
import { Err, Ok, type Result } from "~/shared/result";

type LeadUpload = {
  leadId: WorkflowLeadId;
  file: {
    name: string;
    sizeBytes: number;
    stream: ReadableStream<Uint8Array>;
  };
};

type FileOperationResult<T> = Result<T, WireError>;

async function executeFileOperation<T>(
  operation: Promise<T>,
): Promise<FileOperationResult<T>> {
  try {
    return Ok(await operation);
  } catch (error) {
    if (error instanceof ActionError && error.wire.kind !== "internal") {
      return Err(error.wire);
    }

    throw error;
  }
}

function parseLeadUpload(formData: unknown): Result<LeadUpload, DomainError> {
  if (!(formData instanceof FormData)) {
    return Err(invalid({ code: "invalid_input" }));
  }

  const parsedFields = parseObject(
    { leadId: formData.get("leadId") },
    validationFail,
    (r) => ({
      leadId: r.id("leadId", WorkflowLeadId),
    }),
  );

  if (!parsedFields.ok) {
    return parsedFields;
  }

  const file = formData.get("file");

  if (!(file instanceof File)) {
    return Err(fail("file_required"));
  }

  return Ok({
    leadId: parsedFields.value.leadId,
    file: {
      name: file.name,
      sizeBytes: file.size,
      stream: file.stream(),
    },
  });
}

export async function listLeadSaleProofFiles(rawLeadId: string) {
  "use server";

  return executeSessionServerFunction({
    name: "workflow.list_sale_proof_files",
    access: { kind: "auth" },

    parse: () =>
      parseObject({ leadId: rawLeadId }, validationFail, (r) => ({
        leadId: r.id("leadId", WorkflowLeadId),
      })),

    audit: ({ leadId }) => ({ leadId }),

    execute: (ctx, { leadId }) =>
      getWorkflowRuntime().leadFiles.listSaleProofFiles({
        ctx,
        leadId,
      }),
  });
}

export async function requestWorkflowLeadsExportDownloadToken(): Promise<{
  token: string;
}> {
  "use server";

  return executeSessionServerFunction({
    name: "workflow.request_leads_export_download_token",
    access: { kind: "auth" },

    execute: (ctx) =>
      getWorkflowRuntime().leadFiles.requestLeadsExportDownloadToken({
        ctx,
      }),
  });
}

export async function uploadLeadSaleProofFile(formData: FormData) {
  "use server";

  return executeSessionServerFunction({
    name: "workflow.upload_sale_proof_file",
    access: { kind: "auth" },

    parse: () => parseLeadUpload(formData),

    audit: ({ leadId, file }) => ({
      leadId,
      fileName: file.name,
      sizeBytes: file.sizeBytes,
    }),

    execute: (ctx, { leadId, file }) =>
      getWorkflowRuntime().leadFiles.uploadSaleProofFile({
        ctx,
        leadId,
        file,
      }),
  });
}

export async function requestLeadSaleProofDownloadToken(input: {
  leadId: string;
  fileId: string;
}) {
  "use server";

  return executeSessionServerFunction({
    name: "workflow.request_sale_proof_download_token",
    access: { kind: "auth" },

    parse: () =>
      parseObject(input, validationFail, (r) => ({
        leadId: r.id("leadId", WorkflowLeadId),
        fileAssetId: r.id("fileId", FileAssetId),
      })),

    audit: ({ leadId, fileAssetId }) => ({
      leadId,
      fileAssetId,
    }),

    execute: (ctx, { leadId, fileAssetId }) =>
      getWorkflowRuntime().leadFiles.requestSaleProofDownloadToken({
        ctx,
        leadId,
        fileAssetId,
      }),
  });
}

export async function uploadLeadRateRevisionFile(
  formData: FormData,
): Promise<Result<LeadRateRevisionFileView, WireError>> {
  "use server";

  return executeFileOperation(
    executeSessionServerFunction({
      name: "workflow.upload_rate_revision_file",
      access: { kind: "auth" },

      parse: () => parseLeadUpload(formData),

      audit: ({ leadId, file }) => ({
        leadId,
        fileName: file.name,
        sizeBytes: file.sizeBytes,
      }),

      execute: (ctx, { leadId, file }) =>
        getWorkflowRuntime().leadFiles.uploadRateRevisionFile({
          ctx,
          leadId,
          file,
        }),
    }),
  );
}

export async function requestRateRevisionFileDownloadToken(input: {
  leadId: string;
  fileId: string;
}) {
  "use server";

  return executeFileOperation(
    executeSessionServerFunction({
      name: "workflow.request_rate_revision_download_token",
      access: { kind: "auth" },

      parse: () =>
        parseObject(input, validationFail, (r) => ({
          leadId: r.id("leadId", WorkflowLeadId),
          fileId: r.id("fileId", WorkflowRateRevisionFileId),
        })),

      audit: ({ leadId, fileId }) => ({
        leadId,
        fileId,
      }),

      execute: (ctx, { leadId, fileId }) =>
        getWorkflowRuntime().leadFiles.requestRateRevisionDownloadToken({
          ctx,
          leadId,
          fileId,
        }),
    }),
  );
}
