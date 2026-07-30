import { query } from "@solidjs/router";

import { getBulkImportSetup } from "~/server/team/ui/queries";

export const bulkImportSetupQuery = query(
  async () => {
    "use server";
    return getBulkImportSetup();
  },
  "team.bulk-import-setup",
);
