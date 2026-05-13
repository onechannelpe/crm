"use server";

import type {
  LeadArtifactInput,
  LeadIdInput,
} from "~/contracts/workflow/inputs";
import type { LeadSaleProofFileView } from "~/contracts/workflow/results";
import { validationError } from "~/lib/app-errors";
import { maxUploadBytesForArtifactType } from "~/server/files/validators";
import { getServerRuntime } from "~/server/runtime";
import { runAction } from "~/server/shared/action-runtime";

export async function listLeadSaleProofFiles(
  leadId: string,
): Promise<LeadSaleProofFileView[]> {
  if (!leadId.trim()) {
    throw validationError("leadId is required");
  }

  return runAction({
    actionName: "workflow.sale_proof.list",
    access: { kind: "auth" },
    input: { leadId },
    execute: (ctx) =>
      getServerRuntime().workflow.commands.listSaleProofFiles({ ctx, leadId }),
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
    actionName: "workflow.sale_proof.upload",
    access: { kind: "auth" },
    input: { leadId },
    execute: async (ctx) => {
      const file = formData.get("file");
      if (!(file instanceof File)) throw validationError("file is required");
      if (file.size > maxUploadBytesForArtifactType("sale_proof")) {
        throw validationError("file_too_large");
      }

      return getServerRuntime().workflow.commands.uploadSaleProofFile({
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
    actionName: "workflow.sale_proof.download_token",
    access: { kind: "auth" },
    input,
    execute: (ctx) =>
      getServerRuntime().workflow.commands.requestSaleProofDownloadToken({
        ctx,
        leadId: input.leadId,
        artifactId: input.artifactId,
      }),
  });
}
