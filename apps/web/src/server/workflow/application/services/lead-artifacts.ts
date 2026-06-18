import { hasPermission } from "~/lib/auth/access/rbac";
import type { ArtifactRepos } from "~/server/files/service/contracts";
import { createDownloadArtifact } from "~/server/files/service/create-download-artifact";
import { requestArtifact } from "~/server/files/service/request-artifact";
import { requestDownloadToken } from "~/server/files/service/request-download-token";
import { uploadArtifactFile } from "~/server/files/service/upload-artifact";
import type { FileStorage } from "~/server/files/storage";
import { buildRecordExportCsv } from "~/server/integrations/infrastructure/lead-export-builder";
import type { AppContext } from "~/server/shared/action-runtime/context";
import {
  external,
  fail,
  forbidden,
  type DomainError,
} from "~/server/shared/domain-error";
import { Err, Ok, type Result } from "~/server/shared/result";
import type {
  LeadRateRevisionFileView,
  LeadSaleProofFileView,
} from "~/server/workflow/types";

import { authorizeLeadAction } from "../../domain/lead/policy";
import type {
  LeadQueries,
  LeadReadRepository,
  RecordExportRow,
} from "../ports/lead";

const LEAD_EXPORT_COLUMNS: {
  header: string;
  value: (row: RecordExportRow) => unknown;
}[] = [
  { header: "RUC", value: (row) => row.ruc },
  { header: "Razón social", value: (row) => row.legalName ?? "" },
  { header: "ID ejecutivo", value: (row) => row.executiveId },
  { header: "Ejecutivo", value: (row) => row.executiveName },
  {
    header: "Fecha de registro",
    value: (row) => new Date(row.createdAt).toISOString().slice(0, 10),
  },
  { header: "Etapa", value: (row) => row.stage },
  { header: "Dirección", value: (row) => row.address ?? "" },
  { header: "Estado", value: (row) => row.status ?? "" },
  { header: "Prioridad", value: (row) => row.priority ?? "" },
  { header: "Competencia", value: (row) => row.currentProvider ?? "" },
  { header: "Tasa comp. TD", value: (row) => row.currentDebitRate ?? "" },
  { header: "Tasa comp. TC", value: (row) => row.currentCreditRate ?? "" },
  { header: "Tasa Culqi TD", value: (row) => row.proposedDebitRate ?? "" },
  { header: "Tasa Culqi TC", value: (row) => row.proposedCreditRate ?? "" },
  { header: "Proyectado", value: (row) => row.gpv ?? "" },
  { header: "Observación", value: () => "" },
];

type LeadArtifactDeps = {
  leadReader: LeadReadRepository;
  leadQueries: LeadQueries;
  filesRepo: ArtifactRepos;
  filesStorage: FileStorage;
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
    return Err(fail("lead_not_found"));
  }
  const access = authorizeLeadAction(
    "view",
    { userId: input.ctx.actor.userId, role: input.ctx.actor.role },
    lead,
  );
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
    async requestLeadsExportDownloadToken(input: {
      ctx: AppContext;
    }): Promise<Result<{ token: string }, DomainError>> {
      if (!hasPermission(input.ctx.actor.role, "integration:manage")) {
        return Err(forbidden());
      }

      const rows = await deps.leadQueries.export({
        actorUserId: input.ctx.actor.userId,
        actorRole: input.ctx.actor.role,
        actorBranchId: input.ctx.actor.branchId,
      });
      const csv = buildRecordExportCsv(
        LEAD_EXPORT_COLUMNS.map((column) => column.header),
        rows.map((row) =>
          LEAD_EXPORT_COLUMNS.map((column) => column.value(row)),
        ),
      );
      const bytes = new TextEncoder().encode(csv);

      const requested = await createDownloadArtifact(
        input.ctx,
        {
          artifactType: "records_export",
          workflowContext: {},
          filename: "records-export.csv",
          bytes,
        },
        {
          repo: deps.filesRepo,
          storage: deps.filesStorage,
        },
      );
      if (!requested.ok) return requested;

      return requestDownloadToken(input.ctx, requested.value.artifact.id, {
        repo: deps.filesRepo,
      });
    },

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
        return Err(fail("lead_not_live"));
      }
      if (!hasPermission(input.ctx.actor.role, "lead:sale:upload-proof")) {
        return Err(forbidden());
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
        },
      );
      if (!requested.ok) return requested;

      const artifactId = requested.value.id;
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
          external("File asset not found", { code: "file_asset_unavailable" }),
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
        return Err(fail("sale_proof_not_found"));
      }

      return requestDownloadToken(input.ctx, input.artifactId, {
        repo: deps.filesRepo,
      });
    },

    async uploadRateRevisionFile(input: {
      ctx: AppContext;
      leadId: string;
      file: {
        name: string;
        sizeBytes: number;
        stream: ReadableStream<Uint8Array>;
      };
    }): Promise<Result<LeadRateRevisionFileView, DomainError>> {
      const lead = await requireReadableLead(deps, input);
      if (!lead.ok) return lead;

      if (lead.value.stage !== "PRICING") {
        return Err(fail("lead_not_in_pricing"));
      }
      if (lead.value.executiveId !== input.ctx.actor.userId) {
        return Err(forbidden());
      }

      const requested = await requestArtifact(
        input.ctx,
        {
          artifactType: "rate_revision_file",
          executionMode: "async",
          workflowContext: { kind: "rate_revision_file", leadId: input.leadId },
        },
        {
          repo: deps.filesRepo,
        },
      );
      if (!requested.ok) return requested;

      const artifactId = requested.value.id;
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
          external("File asset not found", { code: "file_asset_unavailable" }),
        );
      }

      return Ok({
        artifactId,
        filename: fileAsset.safeDisplayFilename,
        detectedMime: fileAsset.detectedMime,
        sizeBytes: fileAsset.sizeBytes,
      });
    },

    async requestRateRevisionDownloadToken(input: {
      ctx: AppContext;
      leadId: string;
      artifactId: string;
    }): Promise<Result<{ token: string }, DomainError>> {
      const lead = await requireReadableLead(deps, input);
      if (!lead.ok) return lead;

      const record = await deps.filesRepo.rateRevision.findByArtifactId(
        input.artifactId,
      );
      if (!record || record.leadId !== input.leadId) {
        return Err(fail("file_not_found"));
      }

      return requestDownloadToken(input.ctx, input.artifactId, {
        repo: deps.filesRepo,
      });
    },
  };
}
