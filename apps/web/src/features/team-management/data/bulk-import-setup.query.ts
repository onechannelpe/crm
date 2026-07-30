import { query } from "@solidjs/router";

type GetBulkImportSetup =
  (typeof import("~/actions/team/read.action"))["getBulkImportSetup"];

export const bulkImportSetupQuery = query(
  async (...args: Parameters<GetBulkImportSetup>) => {
    "use server";

    const { getBulkImportSetup } = await import("~/actions/team/read.action");
    return getBulkImportSetup(...args);
  },
  "team.bulk-import-setup",
);
