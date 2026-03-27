import type { SalesExportServiceDeps } from "~/server/sales-exports/service";

export async function createSalesExportRuntime(): Promise<SalesExportServiceDeps> {
  const { repos } = await import("~/server/shared/context");
  return {
    reportExportJobs: repos.reportExportJobs,
    users: repos.users,
  };
}
