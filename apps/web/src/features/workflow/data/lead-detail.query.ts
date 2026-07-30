import { query } from "@solidjs/router";

type QueryLeadDetail =
  (typeof import("~/actions/workflow/queries/records.action"))["queryLeadDetail"];

export const leadDetailQuery = query(
  async (...args: Parameters<QueryLeadDetail>) => {
    "use server";

    const { queryLeadDetail } =
      await import("~/actions/workflow/queries/records.action");
    return queryLeadDetail(...args);
  },
  "workflow.lead-detail",
);
