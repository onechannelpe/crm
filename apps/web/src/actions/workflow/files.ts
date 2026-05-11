"use server";

import { validationError } from "~/lib/app-errors";
import { requestArtifact } from "~/server/files/service/request-artifact";
import { requestDownloadToken } from "~/server/files/service/request-download-token";
import { uploadArtifactFile } from "~/server/files/service/upload-artifact";
import { maxUploadBytesForArtifactType } from "~/server/files/validators";
import { getServerRuntime } from "~/server/runtime";
import { runAction, type AppContext } from "~/server/shared/action-runtime";
import { domainError, type DomainError } from "~/server/shared/domain-error";
import { Err, isErr, Ok, type Result } from "~/server/shared/result";
import {
  canUploadSaleProof,
  requireLeadAccess,
} from "~/server/workflow/application/policies/access";
import type { LeadRecord } from "~/server/workflow/domain/lead-record";

export type LeadSaleProofFileView = {
  id: number;
  artifactId: string;
  filename: string;
  detectedMime: string;
  sizeBytes: number;
  uploadedAt: number;
  uploadedByUserId: number;
  status: "ready" | "processing" | "failed";
};

function toSaleProofStatus(status: string): LeadSaleProofFileView["status"] {
  if (status === "failed") return "failed";
  if (status === "ready" || status === "completed") return "ready";
  return "processing";
}

function mapSaleProofFile(record: {
  id: number;
  artifactId: string;
  safeDisplayFilename: string;
  detectedMime: string;
  sizeBytes: number;
  createdAt: number;
  uploadedByUserId: number;
  artifactStatus: string;
}): LeadSaleProofFileView {
  return {
    id: record.id,
    artifactId: record.artifactId,
    filename: record.safeDisplayFilename,
    detectedMime: record.detectedMime,
    sizeBytes: record.sizeBytes,
    uploadedAt: record.createdAt,
    uploadedByUserId: record.uploadedByUserId,
    status: toSaleProofStatus(record.artifactStatus),
  };
}

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

  if (isErr(access)) {
    return access;
  }

  return Ok(lead);
}

async function requireLiveLeadContext(
  ctx: AppContext,
  leadId: string,
): Promise<Result<LeadRecord, DomainError>> {
  const leadResult = await requireLeadWithAccess(ctx, leadId);
  if (isErr(leadResult)) return leadResult;

  const lead = leadResult.value;
  if (lead.stage !== "LIVE") {
    return Err(
      domainError(
        "conflict",
        "lead_not_live",
        "Sale proof uploads are only allowed when the lead is live",
      ),
    );
  }

  return Ok(lead);
}

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
    execute: async (ctx) => {
      const { files } = getServerRuntime();
      const leadResult = await requireLeadWithAccess(ctx, leadId);
      if (isErr(leadResult)) return leadResult;

      const records = await files.repo.sales.listByLead(leadId);
      return Ok(records.map(mapSaleProofFile));
    },
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

      const { files } = getServerRuntime();
      const leadResult = await requireLiveLeadContext(ctx, leadId);
      if (isErr(leadResult)) return leadResult;

      if (!canUploadSaleProof(ctx.actor.role)) {
        return Err(domainError("forbidden", "forbidden", "Access denied"));
      }

      const requestResult = await requestArtifact(
        ctx,
        {
          artifactType: "sale_proof",
          executionMode: "async",
          workflowContext: {
            kind: "sale_proof",
            leadId,
          },
        },
        {
          repo: files.repo,
          storage: files.storage,
          syncExecutor: files.syncExecutor,
        },
      );
      if (isErr(requestResult)) {
        return requestResult;
      }

      const artifactId = requestResult.value.artifact.id;
      const uploadResult = await uploadArtifactFile(
        ctx,
        artifactId,
        { name: file.name, sizeBytes: file.size, stream: file.stream() },
        { repo: files.repo, storage: files.storage },
      );
      if (isErr(uploadResult)) {
        return uploadResult;
      }

      const fileAsset = await files.repo.artifacts.findFileAssetForArtifact(
        artifactId,
        "source_upload",
      );
      if (!fileAsset) {
        throw new Error("File not found for this artifact");
      }

      const createdAt = ctx.now();
      const id = await files.repo.sales.insert({
        leadId,
        artifactId,
        fileAssetId: fileAsset.id,
        uploadedByUserId: ctx.actor.userId,
        now: createdAt,
      });

      return Ok(
        mapSaleProofFile({
          id,
          artifactId,
          safeDisplayFilename: fileAsset.safeDisplayFilename,
          detectedMime: fileAsset.detectedMime,
          sizeBytes: fileAsset.sizeBytes,
          createdAt,
          uploadedByUserId: ctx.actor.userId,
          artifactStatus: uploadResult.value.status,
        }),
      );
    },
  });
}

export async function requestLeadSaleProofDownloadToken(input: {
  leadId: string;
  artifactId: string;
}): Promise<{ token: string }> {
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
    execute: async (ctx) => {
      const { files } = getServerRuntime();
      const leadResult = await requireLeadWithAccess(ctx, input.leadId);
      if (isErr(leadResult)) return leadResult;

      const saleProof = await files.repo.sales.findByArtifactId(
        input.artifactId,
      );
      if (!saleProof || saleProof.leadId !== input.leadId) {
        return Err(
          domainError(
            "not_found",
            "sale_proof_not_found",
            "Sale proof not found",
          ),
        );
      }

      return requestDownloadToken(ctx, input.artifactId, { repo: files.repo });
    },
  });
}
