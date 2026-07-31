import { query } from "@solidjs/router";

import { getInviteManagement } from "~/server/team/ui/queries";

export const inviteManagementQuery = query(async () => {
  "use server";
  return getInviteManagement();
}, "team.invite-management");
