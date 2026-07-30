import { query } from "@solidjs/router";

type GetExecutiveDetail =
  (typeof import("~/actions/capacity/read.action"))["getExecutiveDetail"];

export const executiveCapacityDetailQuery = query(
  async (...args: Parameters<GetExecutiveDetail>) => {
    "use server";

    const { getExecutiveDetail } =
      await import("~/actions/capacity/read.action");
    return getExecutiveDetail(...args);
  },
  "capacity.executive-detail",
);
