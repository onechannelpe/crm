"use server";

import { AppError, validationError } from "~/lib/app-errors";
import { requestArtifact } from "~/server/files/service/request-artifact";
import { requestDownloadToken } from "~/server/files/service/request-download-token";
import { uploadArtifactFile } from "~/server/files/service/upload-artifact";
import { maxUploadBytesForArtifactType } from "~/server/files/validators";
import { getServerRuntime } from "~/server/runtime";
import { runActionResult } from "~/server/shared/action-runtime";
import type { AppContext } from "~/server/shared/action-runtime";
import { domainError, type DomainError } from "~/server/shared/domain-error";
import { Err, isErr, Ok, type Result } from "~/server/shared/result";
import { requireLeadAccess } from "~/server/workflow/application/policies/access";
import type { LeadRecord } from "~/server/workflow/domain/lead-record";

export type LeadNegotiationFileView = {
  artifactId: string;
  filename: string;
  detectedMime: string;
  sizeBytes: number;
};

async function requireLeadWithAccess(
  ctx: AppContext,
  leadId: string,
): Promise<Result<LeadRecord, DomainError>> {
  const { workflow } = getServerRuntime();
  const lead = await workflow.repos.leads.findById(leadId);
  if (!lead) {
    return Err(domainError("not_found", "lead_not_found", "Lead not found"));
  }
  const access = requireLeadAccess({
    actorUserId: ctx.actor.userId,
    actorRole: ctx.actor.role,
    executiveId: lead.executiveId,
  });
  if (isErr(access)) return access;
  return Ok(lead);
}

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

      const { files } = getServerRuntime();

      const leadResult = await requireLeadWithAccess(ctx, leadId);
      if (isErr(leadResult)) return leadResult;

      const lead = leadResult.value;
      if (lead.stage !== "QUOTED") {
        return Err(
          domainError(
            "conflict",
            "lead_not_quoted",
            "Negotiation files can only be uploaded when the lead is in QUOTED stage",
          ),
        );
      }

      if (lead.executiveId !== ctx.actor.userId) {
        return Err(domainError("forbidden", "forbidden", "Access denied"));
      }

      const requestResult = await requestArtifact(
        ctx,
        {
          artifactType: "negotiation_file",
          executionMode: "async",
          workflowContext: { kind: "negotiation_file", leadId },
        },
        {
          repo: files.repo,
          storage: files.storage,
          syncExecutor: files.syncExecutor,
        },
      );
      if (isErr(requestResult)) return requestResult;

      const artifactId = requestResult.value.artifact.id;
      const uploadResult = await uploadArtifactFile(
        ctx,
        artifactId,
        { name: file.name, sizeBytes: file.size, stream: file.stream() },
        { repo: files.repo, storage: files.storage },
      );
      if (isErr(uploadResult)) return uploadResult;

      const fileAsset = await files.repo.artifacts.findFileAssetForArtifact(
        artifactId,
        "source_upload",
      );
      if (!fileAsset) {
        return Err(
          domainError(
            "external",
            "file_asset_not_found",
            "File asset not found after upload",
          ),
        );
      }

      return Ok({
        artifactId,
        filename: fileAsset.safeDisplayFilename,
        detectedMime: fileAsset.detectedMime,
        sizeBytes: fileAsset.sizeBytes,
      });
    },
  });
}

export async function requestNegotiationFileDownloadToken(input: {
  leadId: string;
  artifactId: string;
}): Promise<Result<{ token: string }, AppError>> {
  if (!input.leadId.trim()) throw validationError("leadId is required");
  if (!input.artifactId.trim()) throw validationError("artifactId is required");

  return runActionResult({
    actionName: "workflow.negotiation_file.download_token",
    access: { kind: "auth" },
    input,
    execute: async (ctx) => {
      const { files } = getServerRuntime();

      const leadResult = await requireLeadWithAccess(ctx, input.leadId);
      if (isErr(leadResult)) return leadResult;

      const record = await files.repo.negotiation.findByArtifactId(
        input.artifactId,
      );
      if (!record || record.leadId !== input.leadId) {
        return Err(
          domainError(
            "not_found",
            "file_not_found",
            "Negotiation file not found",
          ),
        );
      }

      return requestDownloadToken(ctx, input.artifactId, { repo: files.repo });
    },
  });
}
