import { query } from "@solidjs/router";

type GetMySearchAllowance =
  (typeof import("~/actions/search/read.action"))["getMySearchAllowance"];

export const mySearchAllowanceQuery = query(
  async (...args: Parameters<GetMySearchAllowance>) => {
    "use server";

    const { getMySearchAllowance } =
      await import("~/actions/search/read.action");
    return getMySearchAllowance(...args);
  },
  "capacity.my-search-allowance",
);
