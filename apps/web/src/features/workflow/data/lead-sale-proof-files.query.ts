import { query } from "@solidjs/router";

type ListLeadSaleProofFiles =
  (typeof import("~/actions/workflow/files.action"))["listLeadSaleProofFiles"];

export const leadSaleProofFilesQuery = query(
  async (...args: Parameters<ListLeadSaleProofFiles>) => {
    "use server";

    const { listLeadSaleProofFiles } =
      await import("~/actions/workflow/files.action");
    return listLeadSaleProofFiles(...args);
  },
  "workflow.lead-sale-proof-files",
);
