import { query } from "@solidjs/router";

import { queryLeadDetail } from "~/server/workflow/ui/records";

export const leadDetailQuery = query(
  async (leadId: string) => {
    "use server";
    return queryLeadDetail(leadId);
  },
  "workflow.lead-detail",
);
