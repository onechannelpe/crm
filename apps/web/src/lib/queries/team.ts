import { query } from "@solidjs/router";

import { getInviteManagement, getTeamMembers } from "~/actions/team";

export const teamMembersQuery = query(getTeamMembers, "teamMembers");
export const inviteManagementQuery = query(
  getInviteManagement,
  "inviteManagement",
);
