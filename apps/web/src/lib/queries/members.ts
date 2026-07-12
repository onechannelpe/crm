import { query } from "@solidjs/router";

import { getMemberDetail, getMembersRoster } from "~/actions/users/read";

export const membersRosterQuery = query(getMembersRoster, "membersRoster");
export const memberDetailQuery = query(getMemberDetail, "memberDetail");
