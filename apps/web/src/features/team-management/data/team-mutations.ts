import { action, json } from "@solidjs/router";

import type { CreateTeamInviteInput } from "~/contracts/team";
import { inviteManagementQuery } from "~/rpc/team-management/invite-management.query";
import {
  createTeamInvite,
  resendTeamInvite,
  revokeTeamInvite,
} from "~/rpc/team/invites.action";

export const createTeamInviteMutation = action(
  async (input: CreateTeamInviteInput) => {
    const { message, inviteUrl, delivered } = await createTeamInvite(input);

    return json(
      { message, inviteUrl, delivered },
      { revalidate: inviteManagementQuery.key },
    );
  },
  "createTeamInvite",
);

export const resendTeamInviteMutation = action(async (inviteId: string) => {
  const { message } = await resendTeamInvite(inviteId);

  return json({ message }, { revalidate: inviteManagementQuery.key });
}, "resendTeamInvite");

export const revokeTeamInviteMutation = action(async (inviteId: string) => {
  const { message } = await revokeTeamInvite(inviteId);

  return json({ message }, { revalidate: inviteManagementQuery.key });
}, "revokeTeamInvite");
