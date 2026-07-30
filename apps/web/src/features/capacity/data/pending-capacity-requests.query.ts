import { query } from "@solidjs/router";

type GetPendingRequests =
  (typeof import("~/actions/capacity/read.action"))["getPendingRequests"];

export const pendingCapacityRequestsQuery = query(
  async (...args: Parameters<GetPendingRequests>) => {
    "use server";

    const { getPendingRequests } =
      await import("~/actions/capacity/read.action");
    return getPendingRequests(...args);
  },
  "capacity.pending-requests",
);
