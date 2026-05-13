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

import { requireReadableLead } from "../command-kernel/require-lead-access";
import type { LeadSaleProofFileView } from "~/contracts/workflow";
import { canUploadSaleProof } from "../policies/access";
import type { LeadReadRepository } from "../ports/lead-read-repository";

type Deps = {
  leadReader: LeadReadRepository;
  filesRepo: ArtifactRepos;
  filesStorage: FileStorage;
  filesSyncExecutor: SyncExecutor;
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

export async function listSaleProofFiles(
  deps: Deps,
  input: { ctx: AppContext; leadId: string },
): Promise<Result<LeadSaleProofFileView[], DomainError>> {
  const lead = await requireReadableLead({
    leadId: input.leadId,
    actorUserId: input.ctx.actor.userId,
    actorRole: input.ctx.actor.role,
    leadReader: deps.leadReader,
  });
  if (!lead.ok) return lead;

  const rows = await deps.filesRepo.sales.listByLead(input.leadId);
  return Ok(rows.map(mapSaleProofFile));
}

export async function uploadSaleProofFile(
  deps: Deps,
  input: {
    ctx: AppContext;
    leadId: string;
    file: {
      name: string;
      sizeBytes: number;
      stream: ReadableStream<Uint8Array>;
    };
  },
): Promise<Result<LeadSaleProofFileView, DomainError>> {
  const lead = await requireReadableLead({
    leadId: input.leadId,
    actorUserId: input.ctx.actor.userId,
    actorRole: input.ctx.actor.role,
    leadReader: deps.leadReader,
  });
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
      domainError("external", "file_asset_not_found", "File asset not found"),
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
}

export async function requestSaleProofDownloadToken(
  deps: Deps,
  input: { ctx: AppContext; leadId: string; artifactId: string },
): Promise<Result<{ token: string }, DomainError>> {
  const lead = await requireReadableLead({
    leadId: input.leadId,
    actorUserId: input.ctx.actor.userId,
    actorRole: input.ctx.actor.role,
    leadReader: deps.leadReader,
  });
  if (!lead.ok) return lead;

  const saleProof = await deps.filesRepo.sales.findByArtifactId(
    input.artifactId,
  );
  if (!saleProof || saleProof.leadId !== input.leadId) {
    return Err(
      domainError("not_found", "sale_proof_not_found", "Sale proof not found"),
    );
  }

  return requestDownloadToken(input.ctx, input.artifactId, {
    repo: deps.filesRepo,
  });
}
