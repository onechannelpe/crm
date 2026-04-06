"use server";

import { validationError } from "~/lib/app-errors";
import { assertPositiveInt } from "~/lib/contracts/guards";
import { createSalesExportRuntime } from "~/server/sales-exports/runtime";
import {
  getSalesExportJobForActor,
  listSalesExportDownloadsForActor,
  listSalesExportJobsForActor,
  requestSalesExportJob,
  type SalesExportDownload,
  type SalesExportFormat,
  type SalesExportJob,
} from "~/server/sales-exports/service";
import { runAction } from "~/server/shared/action-runtime";

export type { SalesExportDownload, SalesExportFormat, SalesExportJob };

const EXPORT_FORMATS: ReadonlyArray<SalesExportFormat> = ["csv", "xlsx"];

function isSalesExportFormat(value: string): value is SalesExportFormat {
  return EXPORT_FORMATS.some((format) => format === value);
}

function parseSalesExportListLimit(limit: number): number {
  return Math.min(assertPositiveInt(limit, "limit"), 100);
}

function parseSalesExportJobId(jobId: number): number {
  return assertPositiveInt(jobId, "jobId");
}

export async function listSalesExportJobs(
  limit = 20,
): Promise<SalesExportJob[]> {
  const safeLimit = parseSalesExportListLimit(limit);
  const runtime = createSalesExportRuntime();
  return runAction({
    actionName: "sales_exports.list",
    permission: "sales:review",
    input: { limit: safeLimit },
    execute: async (ctx) => ({
      ok: true as const,
      value: await listSalesExportJobsForActor(ctx.actor, safeLimit, runtime),
    }),
  });
}

export async function getSalesExportJob(
  jobId: number,
): Promise<SalesExportJob | null> {
  const safeJobId = parseSalesExportJobId(jobId);
  const runtime = createSalesExportRuntime();
  return runAction({
    actionName: "sales_exports.job.read",
    permission: "sales:review",
    input: { jobId: safeJobId },
    execute: async (ctx) => ({
      ok: true as const,
      value: await getSalesExportJobForActor(ctx.actor, safeJobId, runtime),
    }),
  });
}

export async function listSalesExportDownloads(
  jobId: number,
): Promise<SalesExportDownload[]> {
  const safeJobId = parseSalesExportJobId(jobId);
  const runtime = createSalesExportRuntime();
  return runAction({
    actionName: "sales_exports.downloads.list",
    permission: "sales:review",
    input: { jobId: safeJobId },
    execute: async (ctx) => ({
      ok: true as const,
      value: await listSalesExportDownloadsForActor(
        ctx.actor,
        safeJobId,
        runtime,
      ),
    }),
  });
}

export async function requestSalesExport(
  format: string,
): Promise<SalesExportJob> {
  if (!isSalesExportFormat(format)) {
    throw validationError("format is invalid");
  }
  const runtime = createSalesExportRuntime();
  return runAction({
    actionName: "sales_exports.request",
    permission: "sales:review",
    input: { format },
    execute: async (ctx) => ({
      ok: true as const,
      value: await requestSalesExportJob(ctx, { format }, runtime),
    }),
  });
}
