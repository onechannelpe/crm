import { action, json } from "@solidjs/router";

import { resendTeamInvite, revokeTeamInvite } from "~/actions/team";
import { inviteManagementQuery } from "~/lib/queries/team";

export const resendTeamInviteMutation = action(async (inviteId: number) => {
  await resendTeamInvite(inviteId);
  return json({}, { revalidate: inviteManagementQuery.key });
}, "resendTeamInvite");

export const revokeTeamInviteMutation = action(async (inviteId: number) => {
  await revokeTeamInvite(inviteId);
  return json({}, { revalidate: inviteManagementQuery.key });
}, "revokeTeamInvite");
