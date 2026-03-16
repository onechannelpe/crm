import * as XLSX from "xlsx";

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
  const records = rows.map((row) => ({
    record_id: row.recordId,
    company_name: row.companyName ?? "",
    contact_name: row.contactName ?? "",
    contact_dni: row.contactDni ?? "",
    executive_name: row.executiveName,
    confirmed_at: row.confirmedAt,
  }));
  const worksheet = XLSX.utils.json_to_sheet(records, {
    header: [
      "record_id",
      "company_name",
      "contact_name",
      "contact_dni",
      "executive_name",
      "confirmed_at",
    ],
  });
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Confirmed sales");
  const output: unknown = XLSX.write(workbook, {
    bookType: "xlsx",
    type: "buffer",
  });
  if (output instanceof Uint8Array) return output;
  if (output instanceof ArrayBuffer) return new Uint8Array(output);
  throw new Error("XLSX writer returned an unsupported output type");
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
      const rows = await repos.salesRecords.listConfirmedWithClient(
        scope.scope === "global"
          ? undefined
          : { branchId: scope.branchId ?? job.branch_id },
      );
      const exportRows: ExportRow[] = [];
      for (const row of rows) {
        if (row.confirmed_at === null) {
          throw new Error(
            `Confirmed sales record ${row.id} is missing confirmed_at`,
          );
        }
        exportRows.push({
          recordId: row.id,
          companyName: row.company_name,
          contactName: row.contact_name,
          contactDni: row.dni,
          executiveName: row.executive_name,
          confirmedAt: row.confirmed_at,
        });
      }

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
