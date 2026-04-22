"use server";

import type {
  SalesExportDownload,
  SalesExportFormat,
  SalesExportJob,
} from "~/actions/sales-exports/contracts";
import { validationError } from "~/lib/app-errors";
import { assertPositiveInt } from "~/lib/contracts/guards";
import { getServerRuntime } from "~/server/runtime";
import {
  getSalesExportJobForActor,
  listSalesExportDownloadsForActor,
  listSalesExportJobsForActor,
  requestSalesExportJob,
} from "~/server/sales-exports/service";
import { runAction } from "~/server/shared/action-runtime";

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
  return runAction({
    actionName: "sales_exports.list",
    access: { kind: "permission", permission: "sales:review" },
    input: { limit: safeLimit },
    execute: async (ctx) => ({
      ok: true as const,
      value: await listSalesExportJobsForActor(
        ctx.actor,
        safeLimit,
        getServerRuntime().sales.exportDeps,
      ),
    }),
  });
}

export async function getSalesExportJob(
  jobId: number,
): Promise<SalesExportJob | null> {
  const safeJobId = parseSalesExportJobId(jobId);
  return runAction({
    actionName: "sales_exports.job.read",
    access: { kind: "permission", permission: "sales:review" },
    input: { jobId: safeJobId },
    execute: async (ctx) => ({
      ok: true as const,
      value: await getSalesExportJobForActor(
        ctx.actor,
        safeJobId,
        getServerRuntime().sales.exportDeps,
      ),
    }),
  });
}

export async function listSalesExportDownloads(
  jobId: number,
): Promise<SalesExportDownload[]> {
  const safeJobId = parseSalesExportJobId(jobId);
  return runAction({
    actionName: "sales_exports.downloads.list",
    access: { kind: "permission", permission: "sales:review" },
    input: { jobId: safeJobId },
    execute: async (ctx) => ({
      ok: true as const,
      value: await listSalesExportDownloadsForActor(
        ctx.actor,
        safeJobId,
        getServerRuntime().sales.exportDeps,
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
  return runAction({
    actionName: "sales_exports.request",
    access: { kind: "permission", permission: "sales:review" },
    input: { format },
    execute: async (ctx) => ({
      ok: true as const,
      value: await requestSalesExportJob(
        ctx,
        { format },
        getServerRuntime().sales.exportDeps,
      ),
    }),
  });
}
