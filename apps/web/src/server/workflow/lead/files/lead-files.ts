import type {
  LeadRateRevisionFileView,
  LeadSaleProofFileView,
} from "~/contracts/workflow/results";
import type {
  FulfillmentAction,
  FulfillmentDocKind,
} from "~/contracts/workflow/vocabulary";
import { hasPermission } from "~/lib/auth/access/rbac";
import type { FileRepos } from "~/server/files/service/contracts";
import { issueDownloadToken } from "~/server/files/service/issue-download-token";
import { storeGeneratedFile } from "~/server/files/service/store-generated-file";
import { storeUploadedFile } from "~/server/files/service/store-uploaded-file";
import type { FileStorage } from "~/server/files/storage";
import { buildRecordExportCsv } from "~/server/integrations/infrastructure/lead-export-builder";
import type { AppContext } from "~/server/platform/action/context";
import type { DatabaseExecutor } from "~/server/shared/db-executor";
import {
  fail,
  forbidden,
  type DomainError,
} from "~/server/shared/domain-error";
import type {
  FileAssetId,
  WorkflowLeadId,
  WorkflowRateRevisionFileId,
} from "~/server/shared/ids";
import { Err, Ok, type Result } from "~/server/shared/result";
import { authorizeLeadAction } from "~/server/workflow/lead/domain/policy";
import {
  attachFulfillmentDocumentCommand,
  uploadUnitPaymentProofCommand,
} from "~/server/workflow/lead/fulfillment/commands";
import type { FulfillmentRepository } from "~/server/workflow/lead/fulfillment/repo";
import { docKindForAction } from "~/server/workflow/lead/fulfillment/steps";
import type {
  LeadQueries,
  RecordExportRow,
} from "~/server/workflow/lead/read/lead-queries";
import type { LeadReader } from "~/server/workflow/lead/read/ports";

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

type LeadFilesDeps = {
  leadReader: LeadReader;
  leadQueries: LeadQueries;
  fulfillment: FulfillmentRepository;
  filesRepo: FileRepos;
  filesStorage: FileStorage;
  workflowPorts: () => {
    executor: DatabaseExecutor;
    now: Date;
  };
};

type UploadedFile = {
  name: string;
  sizeBytes: number;
  stream: ReadableStream<Uint8Array>;
};

async function requireReadableLead(
  deps: LeadFilesDeps,
  input: {
    leadId: WorkflowLeadId;
    ctx: AppContext;
  },
): Promise<
  Result<NonNullable<Awaited<ReturnType<LeadReader["findById"]>>>, DomainError>
> {
  const lead = await deps.leadReader.findById(input.leadId);

  if (!lead) {
    return Err(fail("lead_not_found"));
  }

  const access = authorizeLeadAction(
    "view",
    {
      userId: input.ctx.actor.userId,
      role: input.ctx.actor.role,
    },
    lead,
  );

  if (!access.ok) {
    return access;
  }

  return Ok(lead);
}

function mapSaleProofFile(record: {
  id: string;
  fileAssetId: FileAssetId;
  safeDisplayFilename: string;
  detectedMime: string;
  sizeBytes: number;
  createdAt: Date;
  uploadedByUserId: string;
}): LeadSaleProofFileView {
  return {
    id: record.id,
    fileId: record.fileAssetId,
    filename: record.safeDisplayFilename,
    detectedMime: record.detectedMime,
    sizeBytes: record.sizeBytes,
    uploadedAt: record.createdAt.getTime(),
    uploadedByUserId: record.uploadedByUserId,
    status: "ready",
  };
}

function mapRateRevisionFile(record: {
  id: WorkflowRateRevisionFileId;
  safeDisplayFilename: string;
  detectedMime: string;
  sizeBytes: number;
}): LeadRateRevisionFileView {
  return {
    fileId: record.id,
    filename: record.safeDisplayFilename,
    detectedMime: record.detectedMime,
    sizeBytes: record.sizeBytes,
  };
}

export function createLeadFilesService(deps: LeadFilesDeps) {
  async function uploadFulfillmentFileForAction(input: {
    ctx: AppContext;
    leadId: WorkflowLeadId;
    action: FulfillmentAction;
    docKind: FulfillmentDocKind;
    file: UploadedFile;
  }): Promise<Result<{ leadId: string }, DomainError>> {
    const leadResult = await requireReadableLead(deps, input);

    if (!leadResult.ok) {
      return leadResult;
    }

    if (leadResult.value.stage !== "FULFILLMENT") {
      return Err(fail("lead_not_in_fulfillment"));
    }

    const storedFile = await storeUploadedFile(
      input.ctx,
      {
        purpose: input.docKind,
        ...input.file,
      },
      {
        repo: deps.filesRepo,
        storage: deps.filesStorage,
      },
    );

    if (!storedFile.ok) {
      return storedFile;
    }

    return attachFulfillmentDocumentCommand(
      {
        leadId: input.leadId,
        fileAssetId: storedFile.value.id,
        action: input.action,
        actor: {
          userId: input.ctx.actor.userId,
          role: input.ctx.actor.role,
          branchId: input.ctx.actor.branchId,
        },
      },
      deps.workflowPorts(),
    );
  }

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

      const storedFile = await storeGeneratedFile(
        input.ctx,
        {
          purpose: "records_export",
          filename: "records-export.csv",
          bytes: new TextEncoder().encode(csv),
        },
        {
          repo: deps.filesRepo,
          storage: deps.filesStorage,
        },
      );

      if (!storedFile.ok) {
        return storedFile;
      }

      return issueDownloadToken(input.ctx, storedFile.value.id, {
        repo: deps.filesRepo,
      });
    },

    async listSaleProofFiles(input: {
      ctx: AppContext;
      leadId: WorkflowLeadId;
    }): Promise<Result<LeadSaleProofFileView[], DomainError>> {
      const leadResult = await requireReadableLead(deps, input);

      if (!leadResult.ok) {
        return leadResult;
      }

      const records = await deps.filesRepo.sales.listByLead(input.leadId);

      return Ok(records.map(mapSaleProofFile));
    },

    async uploadSaleProofFile(input: {
      ctx: AppContext;
      leadId: WorkflowLeadId;
      file: UploadedFile;
    }): Promise<Result<LeadSaleProofFileView, DomainError>> {
      const leadResult = await requireReadableLead(deps, input);

      if (!leadResult.ok) {
        return leadResult;
      }

      if (leadResult.value.stage !== "LIVE") {
        return Err(fail("lead_not_live"));
      }

      if (!hasPermission(input.ctx.actor.role, "lead:sale:upload-proof")) {
        return Err(forbidden());
      }

      const storedFile = await storeUploadedFile(
        input.ctx,
        {
          purpose: "sale_proof",
          ...input.file,
        },
        {
          repo: deps.filesRepo,
          storage: deps.filesStorage,
        },
      );

      if (!storedFile.ok) {
        return storedFile;
      }

      const createdAt = input.ctx.now();

      const id = await deps.filesRepo.sales.insert({
        leadId: input.leadId,
        fileAssetId: storedFile.value.id,
        uploadedByUserId: input.ctx.actor.userId,
        now: createdAt,
      });

      return Ok(
        mapSaleProofFile({
          id,
          fileAssetId: storedFile.value.id,
          safeDisplayFilename: storedFile.value.safeDisplayFilename,
          detectedMime: storedFile.value.detectedMime,
          sizeBytes: storedFile.value.sizeBytes,
          createdAt,
          uploadedByUserId: input.ctx.actor.userId,
        }),
      );
    },

    async requestSaleProofDownloadToken(input: {
      ctx: AppContext;
      leadId: WorkflowLeadId;
      fileAssetId: FileAssetId;
    }): Promise<Result<{ token: string }, DomainError>> {
      const leadResult = await requireReadableLead(deps, input);

      if (!leadResult.ok) {
        return leadResult;
      }

      const saleProof = await deps.filesRepo.sales.findByFileAssetId({
        leadId: input.leadId,
        fileAssetId: input.fileAssetId,
      });

      if (!saleProof) {
        return Err(fail("sale_proof_not_found"));
      }

      return issueDownloadToken(input.ctx, saleProof.fileAssetId, {
        repo: deps.filesRepo,
      });
    },

    async uploadRateRevisionFile(input: {
      ctx: AppContext;
      leadId: WorkflowLeadId;
      file: UploadedFile;
    }): Promise<Result<LeadRateRevisionFileView, DomainError>> {
      const leadResult = await requireReadableLead(deps, input);

      if (!leadResult.ok) {
        return leadResult;
      }

      if (leadResult.value.stage !== "PRICING") {
        return Err(fail("lead_not_in_pricing"));
      }

      if (leadResult.value.executiveId !== input.ctx.actor.userId) {
        return Err(forbidden());
      }

      const storedFile = await storeUploadedFile(
        input.ctx,
        {
          purpose: "rate_revision_file",
          ...input.file,
        },
        {
          repo: deps.filesRepo,
          storage: deps.filesStorage,
        },
      );

      if (!storedFile.ok) {
        return storedFile;
      }

      const stagedFile = await deps.filesRepo.rateRevision.stage({
        leadId: input.leadId,
        fileAssetId: storedFile.value.id,
        uploadedByUserId: input.ctx.actor.userId,
        now: input.ctx.now(),
      });

      return Ok(mapRateRevisionFile(stagedFile));
    },

    async requestRateRevisionDownloadToken(input: {
      ctx: AppContext;
      leadId: WorkflowLeadId;
      fileId: WorkflowRateRevisionFileId;
    }): Promise<Result<{ token: string }, DomainError>> {
      const leadResult = await requireReadableLead(deps, input);

      if (!leadResult.ok) {
        return leadResult;
      }

      const record = await deps.filesRepo.rateRevision.findById(input.fileId);

      if (!record || record.leadId !== input.leadId) {
        return Err(fail("file_not_found"));
      }

      return issueDownloadToken(input.ctx, record.fileAssetId, {
        repo: deps.filesRepo,
      });
    },

    async uploadFulfillmentDocument(input: {
      ctx: AppContext;
      leadId: WorkflowLeadId;
      action: FulfillmentAction;
      file: UploadedFile;
    }): Promise<Result<{ leadId: string }, DomainError>> {
      const docKind = docKindForAction(input.action);

      if (docKind === null) {
        return Err(fail("invalid_fulfillment_action"));
      }

      return uploadFulfillmentFileForAction({
        ctx: input.ctx,
        leadId: input.leadId,
        action: input.action,
        docKind,
        file: input.file,
      });
    },

    async uploadFulfillmentPaymentProof(input: {
      ctx: AppContext;
      leadId: WorkflowLeadId;
      unitId: string;
      file: UploadedFile;
    }): Promise<Result<{ leadId: string }, DomainError>> {
      const leadResult = await requireReadableLead(deps, input);

      if (!leadResult.ok) {
        return leadResult;
      }

      if (leadResult.value.stage !== "FULFILLMENT") {
        return Err(fail("lead_not_in_fulfillment"));
      }

      const storedFile = await storeUploadedFile(
        input.ctx,
        {
          purpose: "payment_proof",
          ...input.file,
        },
        {
          repo: deps.filesRepo,
          storage: deps.filesStorage,
        },
      );

      if (!storedFile.ok) {
        return storedFile;
      }

      return uploadUnitPaymentProofCommand(
        {
          leadId: input.leadId,
          unitId: input.unitId,
          fileAssetId: storedFile.value.id,
          actor: {
            userId: input.ctx.actor.userId,
            role: input.ctx.actor.role,
            branchId: input.ctx.actor.branchId,
          },
        },
        deps.workflowPorts(),
      );
    },

    async requestFulfillmentDownloadToken(input: {
      ctx: AppContext;
      leadId: WorkflowLeadId;
      fileAssetId: FileAssetId;
    }): Promise<Result<{ token: string }, DomainError>> {
      const leadResult = await requireReadableLead(deps, input);

      if (!leadResult.ok) {
        return leadResult;
      }

      const details = await deps.fulfillment.findByLeadId(input.leadId);

      if (!details) {
        return Err(fail("fulfillment_not_started"));
      }

      const document = await deps.fulfillment.findDocumentByFileAssetId({
        orderId: details.order.id,
        fileAssetId: input.fileAssetId,
      });

      if (!document) {
        return Err(fail("fulfillment_document_not_found"));
      }

      return issueDownloadToken(input.ctx, document.fileAssetId, {
        repo: deps.filesRepo,
      });
    },
  };
}
