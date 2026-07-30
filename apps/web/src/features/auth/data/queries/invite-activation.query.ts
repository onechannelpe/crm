import { query } from "@solidjs/router";

import { getInviteActivationView } from "~/actions/auth/invite.action";

export const inviteActivationViewQuery = query(async (token: string) => {
  "use server";
  return getInviteActivationView(token);
}, "auth.invite.activation-view");
