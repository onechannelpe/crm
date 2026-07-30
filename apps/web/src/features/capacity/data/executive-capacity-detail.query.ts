import { query } from "@solidjs/router";

import { getExecutiveDetail } from "~/server/capacity/ui/queries";

export const executiveCapacityDetailQuery = query(async (userId: string) => {
  "use server";
  return getExecutiveDetail(userId);
}, "capacity.executive-detail");
