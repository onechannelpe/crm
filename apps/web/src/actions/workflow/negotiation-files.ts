"use server";

import type {
  LeadArtifactInput,
  LeadNegotiationFileView,
} from "~/contracts/workflow";
import { AppError, validationError } from "~/lib/app-errors";
import { maxUploadBytesForArtifactType } from "~/server/files/validators";
import { getServerRuntime } from "~/server/runtime";
import { runActionResult } from "~/server/shared/action-runtime";
import type { Result } from "~/server/shared/result";

export async function uploadLeadNegotiationFile(
  leadId: string,
  formData: FormData,
): Promise<Result<LeadNegotiationFileView, AppError>> {
  if (!leadId.trim()) throw validationError("leadId is required");

  return runActionResult({
    actionName: "workflow.negotiation_file.upload",
    access: { kind: "auth" },
    input: { leadId },
    execute: async (ctx) => {
      const file = formData.get("file");
      if (!(file instanceof File)) throw validationError("file is required");
      if (file.size > maxUploadBytesForArtifactType("negotiation_file")) {
        throw validationError("file_too_large");
      }

      return getServerRuntime().workflow.commands.uploadNegotiationFile({
        ctx,
        leadId,
        file: { name: file.name, sizeBytes: file.size, stream: file.stream() },
      });
    },
  });
}

export async function requestNegotiationFileDownloadToken(input: LeadArtifactInput): Promise<Result<{ token: string }, AppError>> {
  if (!input.leadId.trim()) throw validationError("leadId is required");
  if (!input.artifactId.trim()) throw validationError("artifactId is required");

  return runActionResult({
    actionName: "workflow.negotiation_file.download_token",
    access: { kind: "auth" },
    input,
    execute: (ctx) =>
      getServerRuntime().workflow.commands.requestNegotiationDownloadToken({
        ctx,
        leadId: input.leadId,
        artifactId: input.artifactId,
      }),
  });
}
