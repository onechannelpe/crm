import { query } from "@solidjs/router";

import { getMemberDetail } from "~/server/users/ui/queries";

export const memberDetailQuery = query(async (userId: unknown) => {
  "use server";
  return getMemberDetail(userId);
}, "team.member-detail");
