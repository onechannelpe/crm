import { query } from "@solidjs/router";

import { getBulkImportSetup, getInviteManagement } from "~/actions/team/read";

export const inviteManagementQuery = query(
  async () => ({
    ...(await getInviteManagement()),
    evaluatedAt: Date.now(),
  }),
  "inviteManagement",
);
export const bulkImportSetupQuery = query(
  getBulkImportSetup,
  "bulkImportSetup",
);
