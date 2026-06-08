"use server";

import { type LeadNegotiationFileView } from "~/contracts/workflow/results";
import { type AppError } from "~/lib/app-errors";
import { getServerRuntime } from "~/server/runtime";
import { runAction, runActionResult } from "~/server/shared/action-runtime";
import { domainError, type DomainError } from "~/server/shared/domain-error";
import { parseObject, validationFail } from "~/server/shared/parsing";
import { Err, Ok, type Result } from "~/server/shared/result";

type UploadFile = {
  name: string;
  sizeBytes: number;
  stream: ReadableStream<Uint8Array>;
};

type LeadUpload = { leadId: string; file: UploadFile };

type LeadArtifactRef = { leadId: string; artifactId: string };

// The upload payload is multipart form data, not a JSON record, so it is read
// here rather than through the object toolkit. The file stream reaches execute;
// only name and size are projected into the audit record.
function parseLeadUpload(
  leadId: string,
  formData: FormData,
): Result<LeadUpload, DomainError> {
  const trimmed = leadId.trim();
  if (!trimmed) {
    return Err(
      domainError("validation", "lead_id_required", "Lead is required"),
    );
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return Err(domainError("validation", "file_required", "file is required"));
  }

  return Ok({
    leadId: trimmed,
    file: { name: file.name, sizeBytes: file.size, stream: file.stream() },
  });
}

function parseLeadArtifactRef(
  input: unknown,
): Result<LeadArtifactRef, DomainError> {
  return parseObject(input, validationFail, (r) => ({
    leadId: r.str("leadId"),
    artifactId: r.str("artifactId"),
  }));
}

export async function listLeadSaleProofFiles(leadId: string) {
  return runAction({
    actionName: "workflow.list_sale_proof_files",
    access: { kind: "auth" },
    parse: () =>
      parseObject({ leadId }, validationFail, (r) => ({
        leadId: r.str("leadId"),
      })),
    audit: ({ leadId }) => ({ leadId }),
    execute: (ctx, { leadId }) =>
      getServerRuntime().workflow.leadArtifacts.listSaleProofFiles({
        ctx,
        leadId,
      }),
  });
}

export async function requestWorkflowLeadsExportDownloadToken(): Promise<{
  token: string;
}> {
  return runAction({
    actionName: "workflow.request_leads_export_download_token",
    access: { kind: "auth" },
    execute: (ctx) =>
      getServerRuntime().workflow.leadArtifacts.requestLeadsExportDownloadToken(
        { ctx },
      ),
  });
}

export async function uploadLeadSaleProofFile(
  leadId: string,
  formData: FormData,
) {
  return runAction({
    actionName: "workflow.upload_sale_proof_file",
    access: { kind: "auth" },
    parse: () => parseLeadUpload(leadId, formData),
    audit: ({ leadId, file }) => ({
      leadId,
      fileName: file.name,
      sizeBytes: file.sizeBytes,
    }),
    execute: (ctx, { leadId, file }) =>
      getServerRuntime().workflow.leadArtifacts.uploadSaleProofFile({
        ctx,
        leadId,
        file,
      }),
  });
}

export async function requestLeadSaleProofDownloadToken(input: {
  leadId: string;
  artifactId: string;
}) {
  return runAction({
    actionName: "workflow.request_sale_proof_download_token",
    access: { kind: "auth" },
    parse: () => parseLeadArtifactRef(input),
    audit: ({ leadId, artifactId }) => ({ leadId, artifactId }),
    execute: (ctx, { leadId, artifactId }) =>
      getServerRuntime().workflow.leadArtifacts.requestSaleProofDownloadToken({
        ctx,
        leadId,
        artifactId,
      }),
  });
}

export async function uploadLeadNegotiationFile(
  leadId: string,
  formData: FormData,
): Promise<Result<LeadNegotiationFileView, AppError>> {
  return runActionResult({
    actionName: "workflow.upload_negotiation_file",
    access: { kind: "auth" },
    parse: () => parseLeadUpload(leadId, formData),
    audit: ({ leadId, file }) => ({
      leadId,
      fileName: file.name,
      sizeBytes: file.sizeBytes,
    }),
    execute: (ctx, { leadId, file }) =>
      getServerRuntime().workflow.leadArtifacts.uploadNegotiationFile({
        ctx,
        leadId,
        file,
      }),
  });
}

export async function requestNegotiationFileDownloadToken(input: {
  leadId: string;
  artifactId: string;
}) {
  return runActionResult({
    actionName: "workflow.request_negotiation_download_token",
    access: { kind: "auth" },
    parse: () => parseLeadArtifactRef(input),
    audit: ({ leadId, artifactId }) => ({ leadId, artifactId }),
    execute: (ctx, { leadId, artifactId }) =>
      getServerRuntime().workflow.leadArtifacts.requestNegotiationDownloadToken(
        {
          ctx,
          leadId,
          artifactId,
        },
      ),
  });
}
