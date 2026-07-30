import { query } from "@solidjs/router";

type QueryAssignableExecutives =
  (typeof import("~/actions/workflow/queries/records.action"))["queryAssignableExecutives"];

export const assignableExecutivesQuery = query(
  async (...args: Parameters<QueryAssignableExecutives>) => {
    "use server";

    const { queryAssignableExecutives } =
      await import("~/actions/workflow/queries/records.action");
    return queryAssignableExecutives(...args);
  },
  "workflow.assignable-executives",
);
