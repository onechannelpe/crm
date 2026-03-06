import { query } from "@solidjs/router";

import {
  getBulkImportSetup,
  getInviteManagement,
  getTeamMembers,
} from "~/actions/team";

export const teamMembersQuery = query(getTeamMembers, "teamMembers");
export const inviteManagementQuery = query(
  getInviteManagement,
  "inviteManagement",
);
export const bulkImportSetupQuery = query(
  getBulkImportSetup,
  "bulkImportSetup",
);
