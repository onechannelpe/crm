import { query } from "@solidjs/router";

import { getInviteActivationView } from "~/actions/auth/invite";

export const inviteActivationViewQuery = query(
  getInviteActivationView,
  "auth.invite.activation-view",
);
