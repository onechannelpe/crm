import { db } from "~/lib/db/db";
import type { SalesExportServiceDeps } from "~/server/sales-exports/service";
import { createReportExportRepo } from "~/server/sales/repos-report-exports";
import { createUsersRepo } from "~/server/users/repos-users";

export function createSalesExportRuntime(): SalesExportServiceDeps {
  return {
    reportExportJobs: createReportExportRepo(db),
    users: createUsersRepo(db),
  };
}
