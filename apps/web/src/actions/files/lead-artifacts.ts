"use server";

import type { LeadArtifactInput } from "~/contracts/workflow";
import type {
  LeadNegotiationFileView,
  LeadSaleProofFileView,
} from "~/contracts/workflow";
import { AppError, validationError } from "~/lib/app-errors";
import { maxUploadBytesForArtifactType } from "~/server/files/validators";
import { getServerRuntime } from "~/server/runtime";
import { runAction, runActionResult } from "~/server/shared/action-runtime";
import type { Result } from "~/server/shared/result";

export async function listLeadSaleProofFiles(
  leadId: string,
): Promise<LeadSaleProofFileView[]> {
  if (!leadId.trim()) {
    throw validationError("leadId is required");
  }

  return runAction({
    actionName: "files.lead.sale_proof.list",
    access: { kind: "auth" },
    input: { leadId },
    execute: (ctx) =>
      getServerRuntime().files.leadArtifacts.listSaleProofFiles({
        ctx,
        leadId,
      }),
  });
}

export async function uploadLeadSaleProofFile(
  leadId: string,
  formData: FormData,
): Promise<LeadSaleProofFileView> {
  if (!leadId.trim()) {
    throw validationError("leadId is required");
  }

  return runAction({
    actionName: "files.lead.sale_proof.upload",
    access: { kind: "auth" },
    input: { leadId },
    execute: async (ctx) => {
      const file = formData.get("file");
      if (!(file instanceof File)) throw validationError("file is required");
      if (file.size > maxUploadBytesForArtifactType("sale_proof")) {
        throw validationError("file_too_large");
      }

      return getServerRuntime().files.leadArtifacts.uploadSaleProofFile({
        ctx,
        leadId,
        file: { name: file.name, sizeBytes: file.size, stream: file.stream() },
      });
    },
  });
}

export async function requestLeadSaleProofDownloadToken(
  input: LeadArtifactInput,
): Promise<{ token: string }> {
  if (!input.leadId.trim()) {
    throw validationError("leadId is required");
  }
  if (!input.artifactId.trim()) {
    throw validationError("artifactId is required");
  }

  return runAction({
    actionName: "files.lead.sale_proof.download_token",
    access: { kind: "auth" },
    input,
    execute: (ctx) =>
      getServerRuntime().files.leadArtifacts.requestSaleProofDownloadToken({
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
  if (!leadId.trim()) throw validationError("leadId is required");

  return runActionResult({
    actionName: "files.lead.negotiation.upload",
    access: { kind: "auth" },
    input: { leadId },
    execute: async (ctx) => {
      const file = formData.get("file");
      if (!(file instanceof File)) throw validationError("file is required");
      if (file.size > maxUploadBytesForArtifactType("negotiation_file")) {
        throw validationError("file_too_large");
      }

      return getServerRuntime().files.leadArtifacts.uploadNegotiationFile({
        ctx,
        leadId,
        file: { name: file.name, sizeBytes: file.size, stream: file.stream() },
      });
    },
  });
}

export async function requestNegotiationFileDownloadToken(
  input: LeadArtifactInput,
): Promise<Result<{ token: string }, AppError>> {
  if (!input.leadId.trim()) throw validationError("leadId is required");
  if (!input.artifactId.trim()) throw validationError("artifactId is required");

  return runActionResult({
    actionName: "files.lead.negotiation.download_token",
    access: { kind: "auth" },
    input,
    execute: (ctx) =>
      getServerRuntime().files.leadArtifacts.requestNegotiationDownloadToken({
        ctx,
        leadId: input.leadId,
        artifactId: input.artifactId,
      }),
  });
}
