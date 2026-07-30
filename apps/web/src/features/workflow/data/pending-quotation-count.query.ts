import { query } from "@solidjs/router";

type QueryPendingQuotationCount =
  (typeof import("~/actions/workflow/queries/records.action"))["queryPendingQuotationCount"];

export const pendingQuotationCountQuery = query(
  async (...args: Parameters<QueryPendingQuotationCount>) => {
    "use server";

    const { queryPendingQuotationCount } =
      await import("~/actions/workflow/queries/records.action");
    return queryPendingQuotationCount(...args);
  },
  "workflow.pending-quotation-count",
);
