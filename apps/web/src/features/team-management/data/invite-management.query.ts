import { query } from "@solidjs/router";

type GetInviteManagement =
  (typeof import("~/actions/team/read.action"))["getInviteManagement"];

export const inviteManagementQuery = query(
  async (...args: Parameters<GetInviteManagement>) => {
    "use server";

    const { getInviteManagement } = await import("~/actions/team/read.action");
    return getInviteManagement(...args);
  },
  "team.invite-management",
);
