import * as XLSX from "xlsx";

import { type UserId, type LeadId, type BranchId, asBranchId } from "~/server/shared/ids";

import type { SalesExportBlobStore } from "./export-blob-store";
import type {
  ReportExportJobsPort,
  ReportExportLeasedJob,
  SalesExportProcessResult,
  SalesExportService,
  SalesRecordsPort,
  SalesExportFormat,
} from "./types";

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
  format: SalesExportFormat,
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

function parseExportScope(filtersJson: string): {
  scope: "branch" | "global";
  branchId: BranchId | null;
} {
  try {
    const parsed = JSON.parse(filtersJson) as unknown;
    if (typeof parsed !== "object" || parsed === null) {
      return { scope: "branch", branchId: null };
    }
    const scope =
      "scope" in parsed && parsed.scope === "global" ? "global" : "branch";
    const branchId =
      "branchId" in parsed && typeof parsed.branchId === "string"
        ? asBranchId(parsed.branchId)
        : null;
    return { scope, branchId };
  } catch {
    return { scope: "branch", branchId: null };
  }
}

export function createSalesExportService(
  repos: {
    reportExportJobs: ReportExportJobsPort;
    salesRecords: SalesRecordsPort;
  },
  blobStore: SalesExportBlobStore,
): SalesExportService {
  const processJob = async (
    job: ReportExportLeasedJob,
    signal?: AbortSignal,
  ): Promise<SalesExportProcessResult> => {
    const scope = parseExportScope(job.filters_json);
    const rows = await repos.salesRecords.listConfirmedWithClient(
      scope.scope === "global"
        ? undefined
        : { branchId: scope.branchId ?? job.branch_id },
    );

    if (signal?.aborted) throw new Error("Job aborted");

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

    if (signal?.aborted) throw new Error("Job aborted after processing bytes");

    const timestamp = Date.now();
    const extension = job.format === "xlsx" ? "xlsx" : "csv";
    const storageKey = sanitizeStoragePart(
      `sales-export-${job.id}-${timestamp}.${extension}`,
    );

    const stored = await blobStore.put(storageKey, fileBytes);

    if (signal?.aborted) throw new Error("Job aborted after store put");

    const completedAt = Date.now();
    return {
      rowsCount: exportRows.length,
      fileStorageKey: storageKey,
      fileSha256: stored.sha256,
      completedAt,
      expiresAt: completedAt + EXPORT_TTL_MS,
    };
  };

  return {
    reportExportJobsRepo: repos.reportExportJobs,
    processJob,
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
