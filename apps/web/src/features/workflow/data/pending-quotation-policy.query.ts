import { query } from "@solidjs/router";

type QueryPendingQuotationPolicy =
  (typeof import("~/actions/workflow/settings/pending-quotation-policy.action"))["queryPendingQuotationPolicy"];

export const pendingQuotationPolicyQuery = query(
  async (...args: Parameters<QueryPendingQuotationPolicy>) => {
    "use server";

    const { queryPendingQuotationPolicy } =
      await import("~/actions/workflow/settings/pending-quotation-policy.action");
    return queryPendingQuotationPolicy(...args);
  },
  "workflow.pending-quotation-policy",
);
