import type { UserId } from "~/server/shared/ids";

export type SalesExportFormat = "csv" | "xlsx";

export type SalesExportJob = {
  id: number;
  requestedByUserId: UserId;
  requestedByName: string;
  format: SalesExportFormat;
  status: "queued" | "running" | "completed" | "failed" | "expired";
  rowsCount: number | null;
  requestedAt: number;
  completedAt: number | null;
  expiresAt: number | null;
  filters: Record<string, unknown> | null;
};

export type SalesExportDownload = {
  id: number;
  exportJobId: number;
  downloadedByUserId: UserId;
  downloadedByName: string;
  downloadedAt: number;
};
