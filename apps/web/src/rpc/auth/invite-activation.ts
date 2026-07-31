import { query } from "@solidjs/router";

import { getInviteActivationView } from "~/server/auth/ui/invites";

export const inviteActivationViewQuery = query(async (token: string) => {
  "use server";
  return getInviteActivationView(token);
}, "auth.invite.activation-view");
