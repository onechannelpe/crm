import { query } from "@solidjs/router";

export const inviteActivationViewQuery = query(async (token: string) => {
  "use server";

  const { getInviteActivationView } =
    await import("~/actions/auth/invite.action");
  return getInviteActivationView(token);
}, "auth.invite.activation-view");
