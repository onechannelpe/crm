import { query } from "@solidjs/router";

import { queryLeadBootstrapPreview } from "~/server/workflow/ui/records";

export const leadBootstrapPreviewQuery = query(
  async (ruc: string) => {
    "use server";
    return queryLeadBootstrapPreview(ruc);
  },
  "workflow.lead-bootstrap-preview",
);
