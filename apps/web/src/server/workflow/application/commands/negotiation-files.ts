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
import type { LeadNegotiationFileView } from "~/contracts/workflow";
import type { LeadReadRepository } from "../ports/lead-read-repository";

type Deps = {
  leadReader: LeadReadRepository;
  filesRepo: ArtifactRepos;
  filesStorage: FileStorage;
  filesSyncExecutor: SyncExecutor;
};

export async function uploadNegotiationFile(
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
): Promise<Result<LeadNegotiationFileView, DomainError>> {
  const lead = await requireReadableLead({
    leadId: input.leadId,
    actorUserId: input.ctx.actor.userId,
    actorRole: input.ctx.actor.role,
    leadReader: deps.leadReader,
  });
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
      domainError("external", "file_asset_not_found", "File asset not found"),
    );
  }

  return Ok({
    artifactId,
    filename: fileAsset.safeDisplayFilename,
    detectedMime: fileAsset.detectedMime,
    sizeBytes: fileAsset.sizeBytes,
  });
}

export async function requestNegotiationDownloadToken(
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

  const record = await deps.filesRepo.negotiation.findByArtifactId(
    input.artifactId,
  );
  if (!record || record.leadId !== input.leadId) {
    return Err(
      domainError("not_found", "file_not_found", "Negotiation file not found"),
    );
  }

  return requestDownloadToken(input.ctx, input.artifactId, {
    repo: deps.filesRepo,
  });
}
