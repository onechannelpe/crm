import ExcelJS from "exceljs";

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

async function toXlsxBytes(rows: ExportRow[]): Promise<Uint8Array> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Confirmed sales");
  worksheet.columns = [
    { header: "record_id", key: "recordId", width: 12 },
    { header: "company_name", key: "companyName", width: 28 },
    { header: "contact_name", key: "contactName", width: 28 },
    { header: "contact_dni", key: "contactDni", width: 16 },
    { header: "executive_name", key: "executiveName", width: 28 },
    { header: "confirmed_at", key: "confirmedAt", width: 18 },
  ];
  rows.forEach((row) => {
    worksheet.addRow({
      recordId: row.recordId,
      companyName: row.companyName ?? "",
      contactName: row.contactName ?? "",
      contactDni: row.contactDni ?? "",
      executiveName: row.executiveName,
      confirmedAt: row.confirmedAt,
    });
  });
  const buffer = await workbook.xlsx.writeBuffer();
  return buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
}

async function buildExportBytes(
  format: "csv" | "xlsx",
  rows: ExportRow[],
): Promise<Uint8Array> {
  if (format === "xlsx") {
    return toXlsxBytes(rows);
  }
  return new TextEncoder().encode(toCsv(rows));
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

  const processLeasedJob = async (
    job: Awaited<
      ReturnType<Repositories["reportExportJobs"]["leaseQueuedJobs"]>
    >[number],
    leaseOwner: string,
  ): Promise<void> => {
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

      const fileBytes = await buildExportBytes(job.format, exportRows);
      const timestamp = Date.now();
      const extension = job.format === "xlsx" ? "xlsx" : "csv";
      const storageKey = sanitizeStoragePart(
        `sales-export-${job.id}-${timestamp}.${extension}`,
      );

      const stored = await blobStore.put(storageKey, fileBytes);
      const completedAt = Date.now();
      await repos.reportExportJobs.markJobCompleted(
        job.id,
        leaseOwner,
        exportRows.length,
        storageKey,
        stored.sha256,
        completedAt,
        completedAt + EXPORT_TTL_MS,
      );
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to generate export";
      await repos.reportExportJobs.markJobFailed(
        job.id,
        leaseOwner,
        message,
        Date.now(),
      );
    }
  };

  return {
    async runBatch(
      limit: number,
      leaseMs: number,
      leaseOwner: string,
    ): Promise<number> {
      const jobs = await repos.reportExportJobs.leaseQueuedJobs(
        limit,
        leaseMs,
        leaseOwner,
      );
      if (jobs.length < 1) return 0;
      await Promise.all(jobs.map((job) => processLeasedJob(job, leaseOwner)));
      return jobs.length;
    },
    async expireCompleted(limit: number): Promise<number> {
      const jobs = await repos.reportExportJobs.listJobsToExpire(
        limit,
        Date.now(),
      );
      if (jobs.length < 1) return 0;
      await Promise.all(
        jobs.map(async (job) => {
          if (job.file_storage_key) {
            await blobStore.delete(job.file_storage_key);
          }
          await repos.reportExportJobs.markJobExpired(job.id);
        }),
      );
      return jobs.length;
    },
  };
}
