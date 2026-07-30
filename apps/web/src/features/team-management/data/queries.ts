import { query } from "@solidjs/router";

import {
  getBulkImportSetup,
  getInviteManagement,
} from "~/actions/team/read.action";
import { getMemberDetail, getMembersRoster } from "~/actions/users/read.action";

export const membersRosterQuery = query(getMembersRoster, "membersRoster");
export const memberDetailQuery = query(getMemberDetail, "memberDetail");

export const inviteManagementQuery = query(
  getInviteManagement,
  "inviteManagement",
);

export const bulkImportSetupQuery = query(
  getBulkImportSetup,
  "bulkImportSetup",
);
