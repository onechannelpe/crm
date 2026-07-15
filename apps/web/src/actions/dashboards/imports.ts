"use server";

import { maxUploadBytesForFilePurpose } from "~/server/files/validators";
import type { IntegrationJobRow } from "~/server/integrations/types";
import { acceptReport } from "~/server/merchant-stats/commands/accept-report";
import { contentSha256 } from "~/server/merchant-stats/intake/content-hash";
import { cutAtFromFilename } from "~/server/merchant-stats/intake/cut-at";
import { runAction } from "~/server/platform/action";
import { getServerRuntime } from "~/server/platform/container";
import {
  fail,
  throwDomain,
  type DomainError,
} from "~/server/shared/domain-error";
import { IntegrationJobId } from "~/server/shared/ids";
import { parseObject, validationFail } from "~/server/shared/parsing";
import { Err, Ok, type Result } from "~/server/shared/result";

export interface UploadedReport {
  jobId: string | null;
  cutAt: string;
  duplicate: boolean;
}

interface Upload {
  file: File;
  // The cut the export was taken at. Proposed from the filename in the panel and
  // submitted back, so the operator confirms it rather than the decoder guessing
  // it from the data and reading a clock to sanity-check the guess.
  cutAt: Date;
}

function getExtension(filename: string): string | null {
  const dot = filename.lastIndexOf(".");
  if (dot === -1) return null;
  return filename.slice(dot + 1).toLowerCase() || null;
}

function parseUpload(formData: FormData): Result<Upload, DomainError> {
  const file = formData.get("file");
  if (!(file instanceof File)) return Err(fail("file_required"));
  if (getExtension(file.name) !== "xlsx") {
    return Err(fail("unsupported_file_type"));
  }
  if (file.size > maxUploadBytesForFilePurpose("integration_import")) {
    return Err(fail("file_too_large"));
  }

  const raw = formData.get("cutAt");
  const cutAt =
    typeof raw === "string" && raw.length > 0
      ? new Date(raw)
      : cutAtFromFilename(file.name);

  if (!cutAt || Number.isNaN(cutAt.getTime())) {
    return Err(fail("gpv_cut_required"));
  }

  return Ok({ file, cutAt });
}

// Validates, stores and books the file. It does not parse it: a 1,300-row
// workbook costs ~400ms to decode and that is the queue's job.
//
// The storage key is the content hash, so re-uploading the same bytes rewrites
// the same object instead of leaving a copy behind, and the duplicate is caught
// by merchant_reports.content_sha256 before a job is ever created.
export async function uploadMerchantReport(
  formData: FormData,
): Promise<UploadedReport> {
  return runAction({
    name: "dashboards.import.upload",
    access: { kind: "permission", permission: "dashboards:manage" },
    parse: () => parseUpload(formData),
    audit: ({ file, cutAt }) => ({
      fileName: file.name,
      fileSize: file.size,
      cutAt: cutAt.toISOString(),
    }),

    execute: async (ctx, { file, cutAt }) => {
      const runtime = getServerRuntime();
      const bytes = new Uint8Array(await file.arrayBuffer());
      const sha256 = contentSha256(bytes);
      const storageKey = `gpv-reports/${sha256}.xlsx`;

      await runtime.files.storage.putBytes(storageKey, bytes);

      const accepted = await acceptReport(runtime.infra.db, {
        contentSha256: sha256,
        cutAt,
        storageKey,
        sourceFilename: file.name,
        uploadedBy: ctx.actor.userId,
        now: ctx.now(),
      });

      return Ok({
        jobId: accepted.kind === "accepted" ? accepted.jobId : null,
        cutAt: cutAt.toISOString(),
        duplicate: accepted.kind === "duplicate",
      });
    },
  });
}

export async function getMerchantReportJob(
  rawJobId: string,
): Promise<IntegrationJobRow> {
  return runAction({
    name: "dashboards.import.get_job",
    access: { kind: "permission", permission: "dashboards:read" },

    parse: () =>
      parseObject({ jobId: rawJobId }, validationFail, (r) => ({
        jobId: r.id("jobId", IntegrationJobId),
      })),

    audit: (query) => ({ jobId: query.jobId }),

    execute: async (_ctx, query) => {
      const { integration } = getServerRuntime().integrations;
      const job = await integration.jobs.findById(query.jobId);
      if (!job || job.type !== "import_gpv") {
        throwDomain(fail("import_job_not_found"));
      }
      return Ok(job);
    },
  });
}
