import { query } from "@solidjs/router";

import { listLeadSaleProofFiles } from "~/server/workflow/ui/files";

export const leadSaleProofFilesQuery = query(async (leadId: string) => {
  "use server";
  return listLeadSaleProofFiles(leadId);
}, "workflow.lead-sale-proof-files");
