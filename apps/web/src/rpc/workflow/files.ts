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
import { workflow } from "~/server/workflow/ui/composition";
import { Err, Ok, type Result } from "~/shared/result";

interface LeadUpload {
  leadId: WorkflowLeadId;
  file: {
    name: string;
    sizeBytes: number;
    stream: ReadableStream<Uint8Array>;
  };
}

type FileOperationResult<T> = Result<T, WireError>;

function parseLeadUpload(formData: unknown): Result<LeadUpload, DomainError> {
  if (!(formData instanceof FormData)) {
    return Err(invalid({ code: "invalid_input" }));
  }

  const parsed = parseObject(
    { leadId: formData.get("leadId") },
    validationFail,
    (reader) => ({ leadId: reader.id("leadId", WorkflowLeadId) }),
  );
  if (!parsed.ok) return parsed;

  const file = formData.get("file");
  if (!(file instanceof File)) return Err(fail("file_required"));

  return Ok({
    leadId: parsed.value.leadId,
    file: {
      name: file.name,
      sizeBytes: file.size,
      stream: file.stream(),
    },
  });
}

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

export async function requestWorkflowLeadsExportDownloadToken(): Promise<{
  token: string;
}> {
  "use server";

  return executeSessionServerFunction({
    name: "workflow.request_leads_export_download_token",
    access: { kind: "auth" },
    execute: (context) =>
      workflow.files.requestLeadsExportDownloadToken({
        ctx: context,
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
    execute: (context, { leadId, file }) =>
      workflow.files.uploadSaleProofFile({
        ctx: context,
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
      parseObject(input, validationFail, (reader) => ({
        leadId: reader.id("leadId", WorkflowLeadId),
        fileAssetId: reader.id("fileId", FileAssetId),
      })),
    audit: ({ leadId, fileAssetId }) => ({ leadId, fileAssetId }),
    execute: (context, { leadId, fileAssetId }) =>
      workflow.files.requestSaleProofDownloadToken({
        ctx: context,
        leadId,
        fileAssetId,
      }),
  });
}

export async function uploadLeadRateRevisionFile(
  formData: FormData,
): Promise<FileOperationResult<LeadRateRevisionFileView>> {
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
      execute: (context, { leadId, file }) =>
        workflow.files.uploadRateRevisionFile({
          ctx: context,
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
        parseObject(input, validationFail, (reader) => ({
          leadId: reader.id("leadId", WorkflowLeadId),
          fileId: reader.id("fileId", WorkflowRateRevisionFileId),
        })),
      audit: ({ leadId, fileId }) => ({ leadId, fileId }),
      execute: (context, { leadId, fileId }) =>
        workflow.files.requestRateRevisionDownloadToken({
          ctx: context,
          leadId,
          fileId,
        }),
    }),
  );
}
