export type SalesExportFormat = "csv" | "xlsx";

export type SalesExportJob = {
  id: number;
  requestedByUserId: number;
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
  downloadedByUserId: number;
  downloadedByName: string;
  downloadedAt: number;
};
