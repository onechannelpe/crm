"use server";

import type { LeadArtifactInput } from "~/contracts/workflow";
import type { LeadNegotiationFileView } from "~/contracts/workflow";
import { AppError } from "~/lib/app-errors";
import { validationError } from "~/lib/app-errors";
import { getServerRuntime } from "~/server/runtime";
import { runAction, runActionResult } from "~/server/shared/action-runtime";
import type { Result } from "~/server/shared/result";

function parseUploadFile(formData: FormData): {
  name: string;
  sizeBytes: number;
  stream: ReadableStream<Uint8Array>;
} {
  const file = formData.get("file");
  if (!(file instanceof File)) {
    throw validationError("file is required");
  }

  return {
    name: file.name,
    sizeBytes: file.size,
    stream: file.stream(),
  };
}

export async function listLeadSaleProofFiles(leadId: string) {
  return runAction({
    actionName: "workflow.list_sale_proof_files",
    access: { kind: "auth" },
    input: { leadId },
    execute: (ctx) =>
      getServerRuntime().workflow.leadArtifacts.listSaleProofFiles({
        ctx,
        leadId,
      }),
  });
}

export async function uploadLeadSaleProofFile(leadId: string, formData: FormData) {
  const file = parseUploadFile(formData);

  return runAction({
    actionName: "workflow.upload_sale_proof_file",
    access: { kind: "auth" },
    input: { leadId, fileName: file.name, sizeBytes: file.sizeBytes },
    execute: (ctx) =>
      getServerRuntime().workflow.leadArtifacts.uploadSaleProofFile({
        ctx,
        leadId,
        file,
      }),
  });
}

export async function requestLeadSaleProofDownloadToken(input: LeadArtifactInput) {
  return runAction({
    actionName: "workflow.request_sale_proof_download_token",
    access: { kind: "auth" },
    input,
    execute: (ctx) =>
      getServerRuntime().workflow.leadArtifacts.requestSaleProofDownloadToken({
        ctx,
        leadId: input.leadId,
        artifactId: input.artifactId,
      }),
  });
}

export async function uploadLeadNegotiationFile(
  leadId: string,
  formData: FormData,
): Promise<Result<LeadNegotiationFileView, AppError>> {
  const file = parseUploadFile(formData);

  return runActionResult({
    actionName: "workflow.upload_negotiation_file",
    access: { kind: "auth" },
    input: { leadId, fileName: file.name, sizeBytes: file.sizeBytes },
    execute: (ctx) =>
      getServerRuntime().workflow.leadArtifacts.uploadNegotiationFile({
        ctx,
        leadId,
        file,
      }),
  });
}

export async function requestNegotiationFileDownloadToken(input: LeadArtifactInput) {
  return runActionResult({
    actionName: "workflow.request_negotiation_download_token",
    access: { kind: "auth" },
    input,
    execute: (ctx) =>
      getServerRuntime().workflow.leadArtifacts.requestNegotiationDownloadToken({
        ctx,
        leadId: input.leadId,
        artifactId: input.artifactId,
      }),
  });
}
