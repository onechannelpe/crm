"use server";

import { type LeadRateRevisionFileView } from "~/contracts/workflow/results";
import { type WireError } from "~/lib/wire-error";
import { runAction, runActionResult } from "~/server/platform/action";
import { getServerRuntime } from "~/server/platform/container";
import { fail, invalid, type DomainError } from "~/server/shared/domain-error";
import { parseObject, validationFail } from "~/server/shared/parsing";
import { Err, Ok, type Result } from "~/server/shared/result";

type UploadFile = {
  name: string;
  sizeBytes: number;
  stream: ReadableStream<Uint8Array>;
};

type LeadUpload = {
  leadId: string;
  file: UploadFile;
};

type LeadArtifactRef = {
  leadId: string;
  artifactId: string;
};

// The file payload is multipart form data, not a JSON record, so the File is
// read here directly; the leadId still goes through the object toolkit like
// every other id. The file stream reaches execute; only name and size are
// projected into the audit record.
function parseLeadUpload(
  leadId: unknown,
  formData: unknown,
): Result<LeadUpload, DomainError> {
  const parsedLeadId = parseObject({ leadId }, validationFail, (r) => ({
    leadId: r.str("leadId"),
  }));

  if (!parsedLeadId.ok) {
    return parsedLeadId;
  }

  if (!(formData instanceof FormData)) {
    return Err(invalid({ code: "invalid_input" }));
  }

  const file = formData.get("file");

  if (!(file instanceof File)) {
    return Err(fail("file_required"));
  }

  return Ok({
    leadId: parsedLeadId.value.leadId,
    file: {
      name: file.name,
      sizeBytes: file.size,
      stream: file.stream(),
    },
  });
}

function parseLeadArtifactRef(
  input: unknown,
): Result<LeadArtifactRef, DomainError> {
  return parseObject(input, validationFail, (r) => ({
    leadId: r.str("leadId"),
    artifactId: r.str("artifactId"),
  }));
}

export async function listLeadSaleProofFiles(rawLeadId: string) {
  return runAction({
    name: "workflow.list_sale_proof_files",
    access: { kind: "auth" },

    parse: () =>
      parseObject({ leadId: rawLeadId }, validationFail, (r) => ({
        leadId: r.str("leadId"),
      })),

    audit: ({ leadId }) => ({ leadId }),

    execute: (ctx, { leadId }) =>
      getServerRuntime().workflow.leadArtifacts.listSaleProofFiles({
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
      getServerRuntime().workflow.leadArtifacts.requestLeadsExportDownloadToken(
        { ctx },
      ),
  });
}

export async function uploadLeadSaleProofFile(
  rawLeadId: string,
  formData: FormData,
) {
  return runAction({
    name: "workflow.upload_sale_proof_file",
    access: { kind: "auth" },
    parse: () => parseLeadUpload(rawLeadId, formData),

    audit: ({ leadId, file }) => ({
      leadId,
      fileName: file.name,
      sizeBytes: file.sizeBytes,
    }),

    execute: (ctx, { leadId, file }) =>
      getServerRuntime().workflow.leadArtifacts.uploadSaleProofFile({
        ctx,
        leadId,
        file,
      }),
  });
}

export async function requestLeadSaleProofDownloadToken(input: {
  leadId: string;
  artifactId: string;
}) {
  return runAction({
    name: "workflow.request_sale_proof_download_token",
    access: { kind: "auth" },
    parse: () => parseLeadArtifactRef(input),
    audit: ({ leadId, artifactId }) => ({ leadId, artifactId }),

    execute: (ctx, { leadId, artifactId }) =>
      getServerRuntime().workflow.leadArtifacts.requestSaleProofDownloadToken({
        ctx,
        leadId,
        artifactId,
      }),
  });
}

export async function uploadLeadRateRevisionFile(
  rawLeadId: string,
  formData: FormData,
): Promise<Result<LeadRateRevisionFileView, WireError>> {
  return runActionResult({
    name: "workflow.upload_rate_revision_file",
    access: { kind: "auth" },
    parse: () => parseLeadUpload(rawLeadId, formData),

    audit: ({ leadId, file }) => ({
      leadId,
      fileName: file.name,
      sizeBytes: file.sizeBytes,
    }),

    execute: (ctx, { leadId, file }) =>
      getServerRuntime().workflow.leadArtifacts.uploadRateRevisionFile({
        ctx,
        leadId,
        file,
      }),
  });
}

export async function requestRateRevisionFileDownloadToken(input: {
  leadId: string;
  artifactId: string;
}) {
  return runActionResult({
    name: "workflow.request_rate_revision_download_token",
    access: { kind: "auth" },
    parse: () => parseLeadArtifactRef(input),
    audit: ({ leadId, artifactId }) => ({ leadId, artifactId }),

    execute: (ctx, { leadId, artifactId }) =>
      getServerRuntime().workflow.leadArtifacts.requestRateRevisionDownloadToken(
        {
          ctx,
          leadId,
          artifactId,
        },
      ),
  });
}
