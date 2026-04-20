import { config } from "~/lib/config";
import { createFileStorage } from "~/server/files/storage";
import { createSalesExportService } from "~/server/sales/export-service";
import { createReportExportRepo } from "~/server/sales/repos-report-exports";
import { createSalesRecordsRepo } from "~/server/sales/repos-sales-records";
import { createUsersRepo } from "~/server/users/repos-users";

import type { ServerInfra } from "./infra";

export function createSalesRuntime(infra: ServerInfra) {
  const reportExportJobs = createReportExportRepo(infra.db);
  const users = createUsersRepo(infra.db);
  const blobStore = createFileStorage(config.uploads.storageRoot);

  return {
    blobStore,
    exportDeps: { reportExportJobs, users },
    salesExportService: createSalesExportService(
      {
        reportExportJobs,
        salesRecords: createSalesRecordsRepo(infra.db),
      },
      blobStore,
    ),
  };
}
