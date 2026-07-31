import { query } from "@solidjs/router";

import { getPendingRequests } from "~/server/capacity/ui/queries";

export const pendingCapacityRequestsQuery = query(async () => {
  "use server";
  return getPendingRequests();
}, "capacity.pending-requests");
