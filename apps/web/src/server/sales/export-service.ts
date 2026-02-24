import type { Repositories } from "~/server/shared/registry";

import type { SalesExportBlobStore } from "./export-blob-store";

const EXPORT_TTL_MS = 7 * 24 * 60 * 60 * 1000;

interface ExportRow {
  recordId: number;
  companyName: string | null;
  contactName: string | null;
  contactDni: string | null;
  executiveName: string;
  confirmedAt: number;
}

function escapeCsv(value: string): string {
  if (value.includes('"') || value.includes(",") || value.includes("\n")) {
    return `"${value.replaceAll('"', '""')}"`;
  }
  return value;
}

function toCellValue(value: string | number | null): string {
  if (value === null) return "";
  return `${value}`;
}

function toCsv(rows: ExportRow[]): string {
  const header = [
    "record_id",
    "company_name",
    "contact_name",
    "contact_dni",
    "executive_name",
    "confirmed_at",
  ];
  const lines = rows.map((row) =>
    [
      row.recordId,
      row.companyName,
      row.contactName,
      row.contactDni,
      row.executiveName,
      row.confirmedAt,
    ]
      .map((value) => escapeCsv(toCellValue(value)))
      .join(","),
  );
  return [header.join(","), ...lines].join("\n");
}

// Excel opens tab-separated text files reliably; this keeps dependency surface small.
function toExcelText(rows: ExportRow[]): string {
  const header = [
    "record_id",
    "company_name",
    "contact_name",
    "contact_dni",
    "executive_name",
    "confirmed_at",
  ];
  const lines = rows.map((row) =>
    [
      row.recordId,
      row.companyName,
      row.contactName,
      row.contactDni,
      row.executiveName,
      row.confirmedAt,
    ]
      .map((value) => toCellValue(value).replaceAll("\t", " "))
      .join("\t"),
  );
  return [header.join("\t"), ...lines].join("\n");
}

function buildExportContent(format: "csv" | "xlsx", rows: ExportRow[]): string {
  if (format === "xlsx") {
    return toExcelText(rows);
  }
  return toCsv(rows);
}

function sanitizeStoragePart(raw: string): string {
  return raw.replace(/[^a-zA-Z0-9._-]/g, "_");
}

export function createSalesExportService(
  repos: Repositories,
  blobStore: SalesExportBlobStore,
) {
  const parseScope = (
    filtersJson: string,
  ): { scope: "branch" | "global"; branchId: number | null } => {
    try {
      const parsed = JSON.parse(filtersJson) as unknown;
      if (typeof parsed !== "object" || parsed === null) {
        return { scope: "branch", branchId: null };
      }
      const scope =
        "scope" in parsed && parsed.scope === "global" ? "global" : "branch";
      const branchId =
        "branchId" in parsed && typeof parsed.branchId === "number"
          ? parsed.branchId
          : null;
      return { scope, branchId };
    } catch {
      return { scope: "branch", branchId: null };
    }
  };

  const processJob = async (jobId: number): Promise<void> => {
    const job = await repos.reportExportJobs.findJobById(jobId);
    if (!job) {
      throw new Error("Export job not found");
    }
    if (job.status !== "queued" && job.status !== "running") {
      return;
    }

    await repos.reportExportJobs.markJobRunning(jobId);

    try {
      const scope = parseScope(job.filters_json);
      const rows =
        scope.scope === "global"
          ? await repos.salesRecords.findConfirmedWithClient()
          : await repos.salesRecords.findConfirmedWithClientByBranch(
              scope.branchId ?? job.branch_id,
            );
      const exportRows: ExportRow[] = rows.map((row) => ({
        recordId: row.id,
        companyName: row.company_name,
        contactName: row.contact_name,
        contactDni: row.dni,
        executiveName: row.executive_name,
        confirmedAt: row.updated_at,
      }));

      const fileText = buildExportContent(job.format, exportRows);
      const fileBytes = new TextEncoder().encode(fileText);
      const timestamp = Date.now();
      const extension = job.format === "xlsx" ? "xls" : "csv";
      const storageKey = sanitizeStoragePart(
        `sales-export-${job.id}-${timestamp}.${extension}`,
      );

      const stored = await blobStore.put(storageKey, fileBytes);
      const completedAt = Date.now();
      await repos.reportExportJobs.markJobCompleted(
        jobId,
        exportRows.length,
        storageKey,
        stored.sha256,
        completedAt,
        completedAt + EXPORT_TTL_MS,
      );
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to generate export";
      await repos.reportExportJobs.markJobFailed(jobId, message, Date.now());
    }
  };

  return {
    processJob,
    async runBatch(limit: number): Promise<number> {
      const jobs = await repos.reportExportJobs.listQueuedJobs(limit);
      if (jobs.length < 1) return 0;
      await Promise.all(jobs.map((job) => processJob(job.id)));
      return jobs.length;
    },
  };
}
