import { action, json } from "@solidjs/router";

import { resendTeamInvite, revokeTeamInvite } from "~/actions/team/invites";
import { inviteManagementQuery } from "~/lib/queries/team";

export const resendTeamInviteMutation = action(async (inviteId: number) => {
  const { message } = await resendTeamInvite(inviteId);

  return json({ message }, { revalidate: inviteManagementQuery.key });
}, "resendTeamInvite");

export const revokeTeamInviteMutation = action(async (inviteId: number) => {
  const { message } = await revokeTeamInvite(inviteId);

  return json({ message }, { revalidate: inviteManagementQuery.key });
}, "revokeTeamInvite");
