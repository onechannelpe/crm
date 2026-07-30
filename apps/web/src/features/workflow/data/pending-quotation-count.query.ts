import { query } from "@solidjs/router";

import { queryPendingQuotationCount } from "~/server/workflow/ui/records";

export const pendingQuotationCountQuery = query(async () => {
  "use server";
  return queryPendingQuotationCount();
}, "workflow.pending-quotation-count");
