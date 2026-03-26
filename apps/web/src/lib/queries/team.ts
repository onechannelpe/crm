import { query } from "@solidjs/router";

import { getBulkImportSetup, getInviteManagement } from "~/actions/team";

export const inviteManagementQuery = query(
  getInviteManagement,
  "inviteManagement",
);
export const bulkImportSetupQuery = query(
  getBulkImportSetup,
  "bulkImportSetup",
);
