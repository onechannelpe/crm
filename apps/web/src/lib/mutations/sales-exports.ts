import { action, json } from "@solidjs/router";

import { requestSalesExport } from "~/actions/sales-exports";
import { salesExportJobsQuery } from "~/lib/queries/sales-exports";

export const requestSalesExportMutation = action(
  async (format: "csv" | "xlsx") => {
    await requestSalesExport(format);
    return json({}, { revalidate: salesExportJobsQuery.key });
  },
  "requestSalesExport",
);
