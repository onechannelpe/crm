import { query } from "@solidjs/router";

import { getMembersRoster } from "~/server/users/ui/queries";

export const membersRosterQuery = query(async () => {
  "use server";
  return getMembersRoster();
}, "team.members-roster");
