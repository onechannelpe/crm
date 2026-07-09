"use server";

import { type LeadRateRevisionFileView } from "~/contracts/workflow/results";
import { type WireError } from "~/lib/wire-error";
import { runAction, runActionResult } from "~/server/platform/action";
import { getServerRuntime } from "~/server/platform/container";
import { fail, invalid, type DomainError } from "~/server/shared/domain-error";
import {
  asWorkflowArtifactId,
  asWorkflowLeadId,
  type WorkflowArtifactId,
  type WorkflowLeadId,
} from "~/server/shared/ids";
import { parseObject, validationFail } from "~/server/shared/parsing";
import { Err, Ok, type Result } from "~/server/shared/result";

type UploadFile = {
  name: string;
  sizeBytes: number;
  stream: ReadableStream<Uint8Array>;
};

type LeadUpload = {
  leadId: WorkflowLeadId;
  file: UploadFile;
};

type LeadArtifactRef = {
  leadId: WorkflowLeadId;
  artifactId: WorkflowArtifactId;
};

// Top-level FormData argument so SolidStart keeps multipart transport; a
// parsed File would be JSON-serialized and corrupted.
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

function parseLeadArtifactRef(
  input: unknown,
): Result<LeadArtifactRef, DomainError> {
  return parseObject(input, validationFail, (r) => ({
    leadId: asWorkflowLeadId(r.str("leadId")),
    artifactId: asWorkflowArtifactId(r.str("artifactId")),
  }));
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
