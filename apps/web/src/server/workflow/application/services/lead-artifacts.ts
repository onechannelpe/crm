import type {
  ArtifactRepos,
  SyncExecutor,
} from "~/server/files/service/contracts";
import { requestArtifact } from "~/server/files/service/request-artifact";
import { requestDownloadToken } from "~/server/files/service/request-download-token";
import { uploadArtifactFile } from "~/server/files/service/upload-artifact";
import type { FileStorage } from "~/server/files/storage";
import type { AppContext } from "~/server/shared/action-runtime/context";
import { domainError, type DomainError } from "~/server/shared/domain-error";
import { Err, Ok, type Result } from "~/server/shared/result";
import type {
  LeadNegotiationFileView,
  LeadSaleProofFileView,
} from "~/server/workflow/types";

import { canUploadSaleProof, requireLeadAccess } from "../policies/access";
import type { LeadReadRepository } from "../ports/lead";

type LeadArtifactDeps = {
  leadReader: LeadReadRepository;
  filesRepo: ArtifactRepos;
  filesStorage: FileStorage;
  filesSyncExecutor: SyncExecutor;
};

async function requireReadableLead(
  deps: LeadArtifactDeps,
  input: { leadId: string; ctx: AppContext },
): Promise<
  Result<
    NonNullable<Awaited<ReturnType<LeadReadRepository["findById"]>>>,
    DomainError
  >
> {
  const lead = await deps.leadReader.findById(input.leadId);
  if (!lead) {
    return Err(domainError("not_found", "lead_not_found", "Lead not found"));
  }
  const access = requireLeadAccess({
    actorUserId: input.ctx.actor.userId,
    actorRole: input.ctx.actor.role,
    executiveId: lead.executiveId,
  });
  if (!access.ok) {
    return access;
  }
  return Ok(lead);
}

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

export function createLeadArtifactsService(deps: LeadArtifactDeps) {
  return {
    async listSaleProofFiles(input: {
      ctx: AppContext;
      leadId: string;
    }): Promise<Result<LeadSaleProofFileView[], DomainError>> {
      const lead = await requireReadableLead(deps, input);
      if (!lead.ok) return lead;
      const rows = await deps.filesRepo.sales.listByLead(input.leadId);
      return Ok(rows.map(mapSaleProofFile));
    },

    async uploadSaleProofFile(input: {
      ctx: AppContext;
      leadId: string;
      file: {
        name: string;
        sizeBytes: number;
        stream: ReadableStream<Uint8Array>;
      };
    }): Promise<Result<LeadSaleProofFileView, DomainError>> {
      const lead = await requireReadableLead(deps, input);
      if (!lead.ok) return lead;

      if (lead.value.stage !== "LIVE") {
        return Err(
          domainError(
            "conflict",
            "lead_not_live",
            "Sale proof uploads are only allowed when the lead is live",
          ),
        );
      }
      if (!canUploadSaleProof(input.ctx.actor.role)) {
        return Err(domainError("forbidden", "forbidden", "Access denied"));
      }

      const requested = await requestArtifact(
        input.ctx,
        {
          artifactType: "sale_proof",
          executionMode: "async",
          workflowContext: { kind: "sale_proof", leadId: input.leadId },
        },
        {
          repo: deps.filesRepo,
          storage: deps.filesStorage,
          syncExecutor: deps.filesSyncExecutor,
        },
      );
      if (!requested.ok) return requested;

      const artifactId = requested.value.artifact.id;
      const uploaded = await uploadArtifactFile(
        input.ctx,
        artifactId,
        {
          name: input.file.name,
          sizeBytes: input.file.sizeBytes,
          stream: input.file.stream,
        },
        { repo: deps.filesRepo, storage: deps.filesStorage },
      );
      if (!uploaded.ok) return uploaded;

      const fileAsset = await deps.filesRepo.artifacts.findFileAssetForArtifact(
        artifactId,
        "source_upload",
      );
      if (!fileAsset) {
        return Err(
          domainError(
            "external",
            "file_asset_not_found",
            "File asset not found",
          ),
        );
      }

      const createdAt = input.ctx.now();
      const id = await deps.filesRepo.sales.insert({
        leadId: input.leadId,
        artifactId,
        fileAssetId: fileAsset.id,
        uploadedByUserId: input.ctx.actor.userId,
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
          uploadedByUserId: input.ctx.actor.userId,
          artifactStatus: uploaded.value.status,
        }),
      );
    },

    async requestSaleProofDownloadToken(input: {
      ctx: AppContext;
      leadId: string;
      artifactId: string;
    }): Promise<Result<{ token: string }, DomainError>> {
      const lead = await requireReadableLead(deps, input);
      if (!lead.ok) return lead;

      const saleProof = await deps.filesRepo.sales.findByArtifactId(
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

      return requestDownloadToken(input.ctx, input.artifactId, {
        repo: deps.filesRepo,
      });
    },

    async uploadNegotiationFile(input: {
      ctx: AppContext;
      leadId: string;
      file: {
        name: string;
        sizeBytes: number;
        stream: ReadableStream<Uint8Array>;
      };
    }): Promise<Result<LeadNegotiationFileView, DomainError>> {
      const lead = await requireReadableLead(deps, input);
      if (!lead.ok) return lead;

      if (lead.value.stage !== "QUOTED") {
        return Err(
          domainError(
            "conflict",
            "lead_not_quoted",
            "Negotiation files can only be uploaded when the lead is in QUOTED stage",
          ),
        );
      }
      if (lead.value.executiveId !== input.ctx.actor.userId) {
        return Err(domainError("forbidden", "forbidden", "Access denied"));
      }

      const requested = await requestArtifact(
        input.ctx,
        {
          artifactType: "negotiation_file",
          executionMode: "async",
          workflowContext: { kind: "negotiation_file", leadId: input.leadId },
        },
        {
          repo: deps.filesRepo,
          storage: deps.filesStorage,
          syncExecutor: deps.filesSyncExecutor,
        },
      );
      if (!requested.ok) return requested;

      const artifactId = requested.value.artifact.id;
      const uploaded = await uploadArtifactFile(
        input.ctx,
        artifactId,
        {
          name: input.file.name,
          sizeBytes: input.file.sizeBytes,
          stream: input.file.stream,
        },
        { repo: deps.filesRepo, storage: deps.filesStorage },
      );
      if (!uploaded.ok) return uploaded;

      const fileAsset = await deps.filesRepo.artifacts.findFileAssetForArtifact(
        artifactId,
        "source_upload",
      );
      if (!fileAsset) {
        return Err(
          domainError(
            "external",
            "file_asset_not_found",
            "File asset not found",
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

    async requestNegotiationDownloadToken(input: {
      ctx: AppContext;
      leadId: string;
      artifactId: string;
    }): Promise<Result<{ token: string }, DomainError>> {
      const lead = await requireReadableLead(deps, input);
      if (!lead.ok) return lead;

      const record = await deps.filesRepo.negotiation.findByArtifactId(
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

      return requestDownloadToken(input.ctx, input.artifactId, {
        repo: deps.filesRepo,
      });
    },
  };
}
