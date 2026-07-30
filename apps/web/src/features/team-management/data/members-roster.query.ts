import { query } from "@solidjs/router";

type GetMembersRoster =
  (typeof import("~/actions/users/read.action"))["getMembersRoster"];

export const membersRosterQuery = query(
  async (...args: Parameters<GetMembersRoster>) => {
    "use server";

    const { getMembersRoster } = await import("~/actions/users/read.action");
    return getMembersRoster(...args);
  },
  "team.members-roster",
);
