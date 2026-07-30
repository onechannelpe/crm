import { query } from "@solidjs/router";

import { queryPendingQuotationPolicy } from "~/server/workflow/ui/pending-quotation-policy";

export const pendingQuotationPolicyQuery = query(
  async () => {
    "use server";
    return queryPendingQuotationPolicy();
  },
  "workflow.pending-quotation-policy",
);
