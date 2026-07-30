import { query } from "@solidjs/router";

type QueryLeadList =
  (typeof import("~/actions/workflow/queries/records.action"))["queryLeadList"];

export const leadListQuery = query(
  async (...args: Parameters<QueryLeadList>) => {
    "use server";

    const { queryLeadList } =
      await import("~/actions/workflow/queries/records.action");
    return queryLeadList(...args);
  },
  "workflow.lead-list",
);
