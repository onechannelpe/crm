import { query } from "@solidjs/router";

import { listSalesExportJobs } from "~/actions/sales-exports";

export const salesExportJobsQuery = query(
  listSalesExportJobs,
  "salesExportJobs",
);
