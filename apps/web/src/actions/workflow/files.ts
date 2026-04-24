"use server";

import { validationError } from "~/lib/app-errors";
import { requestArtifact } from "~/server/files/service/request-artifact";
import { requestDownloadToken } from "~/server/files/service/request-download-token";
import { uploadArtifactFile } from "~/server/files/service/upload-artifact";
import { maxUploadBytesForArtifactType } from "~/server/files/validators";
import { getServerRuntime } from "~/server/runtime";
import { runAction } from "~/server/shared/action-runtime";
import { domainError } from "~/server/shared/domain-error";
import { Err, isErr, Ok } from "~/server/shared/result";
import {
  canCreateSale,
  requireLeadAccess,
} from "~/server/workflow/application/policies/access";

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
  if (status === "failed") {
    return "failed";
  }

  if (status === "ready" || status === "completed") {
    return "ready";
  }

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
      const { workflow, files } = getServerRuntime();
      const lead = await workflow.deps.leadDetail.leads.findById(leadId);
      if (!lead) {
        return Err(
          domainError("not_found", "lead_not_found", "Lead not found"),
        );
      }

      const canAccess = requireLeadAccess({
        actorUserId: ctx.actor.userId,
        actorRole: ctx.actor.role,
        executiveId: lead.executiveId,
      });
      if (isErr(canAccess)) {
        return canAccess;
      }

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
      if (!(file instanceof File)) {
        throw validationError("file is required");
      }

      if (file.size > maxUploadBytesForArtifactType("sale_proof")) {
        throw validationError("file_too_large");
      }

      const { workflow, files } = getServerRuntime();
      const lead = await workflow.deps.leadDetail.leads.findById(leadId);
      if (!lead) {
        return Err(
          domainError("not_found", "lead_not_found", "Lead not found"),
        );
      }

      if (!canCreateSale(ctx.actor.role)) {
        return Err(domainError("forbidden", "forbidden", "Access denied"));
      }

      const canAccess = requireLeadAccess({
        actorUserId: ctx.actor.userId,
        actorRole: ctx.actor.role,
        executiveId: lead.executiveId,
      });
      if (isErr(canAccess)) {
        return canAccess;
      }

      if (lead.stage !== "CONVERTED") {
        return Err(
          domainError(
            "conflict",
            "lead_not_converted",
            "Sale proof uploads are only allowed when the lead is converted",
          ),
        );
      }

      const sale =
        await workflow.deps.leadDetail.leadSales.findByLeadId(leadId);
      if (!sale) {
        return Err(
          domainError(
            "conflict",
            "sale_not_found",
            "Sale not found for this lead",
          ),
        );
      }

      const requestResult = await requestArtifact(
        ctx,
        {
          artifactType: "sale_proof",
          executionMode: "async",
          workflowContext: {
            kind: "sale_proof",
            leadId,
            saleId: sale.id,
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
        return Err(
          domainError(
            "unexpected",
            "artifact_file_not_found",
            "File not found for this artifact",
          ),
        );
      }

      const createdAt = ctx.now();
      const id = await files.repo.sales.insert({
        leadId,
        saleId: sale.id,
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
      const { workflow, files } = getServerRuntime();
      const lead = await workflow.deps.leadDetail.leads.findById(input.leadId);
      if (!lead) {
        return Err(
          domainError("not_found", "lead_not_found", "Lead not found"),
        );
      }

      const canAccess = requireLeadAccess({
        actorUserId: ctx.actor.userId,
        actorRole: ctx.actor.role,
        executiveId: lead.executiveId,
      });
      if (isErr(canAccess)) {
        return canAccess;
      }

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
