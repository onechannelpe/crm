"use server";

import type { LeadRateRevisionFileView } from "~/contracts/workflow/results";
import type { WireError } from "~/lib/wire-error";
import { runAction, runActionResult } from "~/server/platform/action";
import { getServerRuntime } from "~/server/platform/container";
import { fail, invalid, type DomainError } from "~/server/shared/domain-error";
import {
  asFileAssetId,
  asWorkflowLeadId,
  asWorkflowRateRevisionFileId,
} from "~/server/shared/ids";
import type { WorkflowLeadId } from "~/server/shared/ids";
import { parseObject, validationFail } from "~/server/shared/parsing";
import { Err, Ok, type Result } from "~/server/shared/result";

type LeadUpload = {
  leadId: WorkflowLeadId;
  file: {
    name: string;
    sizeBytes: number;
    stream: ReadableStream<Uint8Array>;
  };
};

function parseLeadUpload(formData: unknown): Result<LeadUpload, DomainError> {
  if (!(formData instanceof FormData)) {
    return Err(invalid({ code: "invalid_input" }));
  }

  const parsedFields = parseObject(
    { leadId: formData.get("leadId") },
    validationFail,
    (r) => ({
      leadId: asWorkflowLeadId(r.str("leadId")),
    }),
  );

  if (!parsedFields.ok) {
    return parsedFields;
  }

  const file = formData.get("file");

  if (!(file instanceof File)) {
    return Err(fail("file_required"));
  }

  return Ok({
    leadId: parsedFields.value.leadId,
    file: {
      name: file.name,
      sizeBytes: file.size,
      stream: file.stream(),
    },
  });
}

export async function listLeadSaleProofFiles(rawLeadId: string) {
  return runAction({
    name: "workflow.list_sale_proof_files",
    access: { kind: "auth" },

    parse: () =>
      parseObject({ leadId: rawLeadId }, validationFail, (r) => ({
        leadId: asWorkflowLeadId(r.str("leadId")),
      })),

    audit: ({ leadId }) => ({ leadId }),

    execute: (ctx, { leadId }) =>
      getServerRuntime().workflow.leadFiles.listSaleProofFiles({
        ctx,
        leadId,
      }),
  });
}

export async function requestWorkflowLeadsExportDownloadToken(): Promise<{
  token: string;
}> {
  return runAction({
    name: "workflow.request_leads_export_download_token",
    access: { kind: "auth" },

    execute: (ctx) =>
      getServerRuntime().workflow.leadFiles.requestLeadsExportDownloadToken({
        ctx,
      }),
  });
}

export async function uploadLeadSaleProofFile(formData: FormData) {
  return runAction({
    name: "workflow.upload_sale_proof_file",
    access: { kind: "auth" },

    parse: () => parseLeadUpload(formData),

    audit: ({ leadId, file }) => ({
      leadId,
      fileName: file.name,
      sizeBytes: file.sizeBytes,
    }),

    execute: (ctx, { leadId, file }) =>
      getServerRuntime().workflow.leadFiles.uploadSaleProofFile({
        ctx,
        leadId,
        file,
      }),
  });
}

export async function requestLeadSaleProofDownloadToken(input: {
  leadId: string;
  fileId: string;
}) {
  return runAction({
    name: "workflow.request_sale_proof_download_token",
    access: { kind: "auth" },

    parse: () =>
      parseObject(input, validationFail, (r) => ({
        leadId: asWorkflowLeadId(r.str("leadId")),
        fileAssetId: asFileAssetId(r.str("fileId")),
      })),

    audit: ({ leadId, fileAssetId }) => ({
      leadId,
      fileAssetId,
    }),

    execute: (ctx, { leadId, fileAssetId }) =>
      getServerRuntime().workflow.leadFiles.requestSaleProofDownloadToken({
        ctx,
        leadId,
        fileAssetId,
      }),
  });
}

export async function uploadLeadRateRevisionFile(
  formData: FormData,
): Promise<Result<LeadRateRevisionFileView, WireError>> {
  return runActionResult({
    name: "workflow.upload_rate_revision_file",
    access: { kind: "auth" },

    parse: () => parseLeadUpload(formData),

    audit: ({ leadId, file }) => ({
      leadId,
      fileName: file.name,
      sizeBytes: file.sizeBytes,
    }),

    execute: (ctx, { leadId, file }) =>
      getServerRuntime().workflow.leadFiles.uploadRateRevisionFile({
        ctx,
        leadId,
        file,
      }),
  });
}

export async function requestRateRevisionFileDownloadToken(input: {
  leadId: string;
  fileId: string;
}) {
  return runActionResult({
    name: "workflow.request_rate_revision_download_token",
    access: { kind: "auth" },

    parse: () =>
      parseObject(input, validationFail, (r) => ({
        leadId: asWorkflowLeadId(r.str("leadId")),
        fileId: asWorkflowRateRevisionFileId(r.str("fileId")),
      })),

    audit: ({ leadId, fileId }) => ({
      leadId,
      fileId,
    }),

    execute: (ctx, { leadId, fileId }) =>
      getServerRuntime().workflow.leadFiles.requestRateRevisionDownloadToken({
        ctx,
        leadId,
        fileId,
      }),
  });
}
