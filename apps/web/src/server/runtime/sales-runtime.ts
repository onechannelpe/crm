import { config } from "~/lib/config";
import { createSalesExportBlobStore } from "~/server/sales/export-blob-store";
import { createSalesExportService } from "~/server/sales/export-service";
import { createReportExportRepo } from "~/server/sales/repos-report-exports";
import { createSalesRecordsRepo } from "~/server/sales/repos-sales-records";

import type { ServerInfra } from "./infra";
import { createServerInfra } from "./infra";

export function createSalesRuntime(infra: ServerInfra) {
  return {
    salesExportService: createSalesExportService(
      {
        reportExportJobs: createReportExportRepo(infra.db),
        salesRecords: createSalesRecordsRepo(infra.db),
      },
      createSalesExportBlobStore(config.uploads.storageRoot),
    ),
  };
}

export const salesRuntime = createSalesRuntime(createServerInfra());
