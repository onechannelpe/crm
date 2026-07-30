import { action, json } from "@solidjs/router";

import {
  createTeamInvite,
  resendTeamInvite,
  revokeTeamInvite,
} from "~/actions/team/invites.action";
import type { CreateTeamInviteInput } from "~/contracts/team";
import { inviteManagementQuery } from "~/features/team-management/data/invite-management.query";

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
