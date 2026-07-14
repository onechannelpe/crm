"use server";

import { randomUUID } from "node:crypto";

import { maxUploadBytesForFilePurpose } from "~/server/files/validators";
import type { IntegrationJobRow } from "~/server/integrations/types";
import { fromGpvXlsx } from "~/server/merchant-stats/intake/parse-report";
import { runAction } from "~/server/platform/action";
import { getServerRuntime } from "~/server/platform/container";
import {
  fail,
  invalid,
  throwDomain,
  type DomainError,
} from "~/server/shared/domain-error";
import { IntegrationJobId } from "~/server/shared/ids";
import { parseObject, validationFail } from "~/server/shared/parsing";
import { Err, Ok, type Result } from "~/server/shared/result";

const GPV_IMPORT_MAX_ATTEMPTS = 3;

function getExtension(filename: string): string | null {
  const dot = filename.lastIndexOf(".");
  if (dot === -1) return null;
  return filename.slice(dot + 1).toLowerCase() || null;
}

function parseUpload(formData: FormData): Result<{ file: File }, DomainError> {
  const file = formData.get("file");
  if (!(file instanceof File)) return Err(fail("file_required"));
  if (getExtension(file.name) !== "xlsx") {
    return Err(fail("unsupported_file_type"));
  }
  if (file.size > maxUploadBytesForFilePurpose("integration_import")) {
    return Err(fail("file_too_large"));
  }
  return Ok({ file });
}

export async function uploadMerchantReport(formData: FormData): Promise<{
  jobId: string;
  cutDate: string;
  hasEnrichment: boolean;
  rowsTotal: number;
}> {
  return runAction({
    name: "dashboards.import.upload",
    access: { kind: "permission", permission: "dashboards:manage" },
    parse: () => parseUpload(formData),
    audit: ({ file }) => ({ fileName: file.name, fileSize: file.size }),

    execute: async (ctx, { file }) => {
      const runtime = getServerRuntime();
      const { storage } = runtime.files;
      const { integration } = runtime.integrations;

      const buffer = await file.arrayBuffer();

      let report;
      try {
        report = fromGpvXlsx(buffer);
      } catch (err) {
        throwDomain(
          invalid({
            code: "invalid_gpv_file",
            details: err instanceof Error ? err.message : err,
          }),
        );
      }

      const rowsTotal = report.validRows.length + report.invalidRows.length;
      const storageKey = `gpv-imports/${randomUUID()}.json`;
      const payload = new TextEncoder().encode(
        JSON.stringify({
          cutDate: report.cutDate,
          sourceFilename: file.name,
          hasEnrichment: report.hasEnrichment,
          validRows: report.validRows,
          invalidRows: report.invalidRows,
        }),
      );

      await storage.putBytes(storageKey, payload);

      const jobId = await integration.jobs.insert({
        type: "import_gpv",
        status: "PENDING",
        requested_by_user_id: ctx.actor.userId,
        file_path: storageKey,
        max_attempts: GPV_IMPORT_MAX_ATTEMPTS,
        created_at: ctx.now(),
      });

      await integration.jobs.updateProgress(jobId, {
        rowsTotal,
        rowsApplied: 0,
        rowsFailed: 0,
      });

      return Ok({
        jobId,
        cutDate: report.cutDate,
        hasEnrichment: report.hasEnrichment,
        rowsTotal,
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
