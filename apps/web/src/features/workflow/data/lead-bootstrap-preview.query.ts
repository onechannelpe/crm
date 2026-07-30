import { query } from "@solidjs/router";

type QueryLeadBootstrapPreview =
  (typeof import("~/actions/workflow/queries/records.action"))["queryLeadBootstrapPreview"];

export const leadBootstrapPreviewQuery = query(
  async (...args: Parameters<QueryLeadBootstrapPreview>) => {
    "use server";

    const { queryLeadBootstrapPreview } =
      await import("~/actions/workflow/queries/records.action");
    return queryLeadBootstrapPreview(...args);
  },
  "workflow.lead-bootstrap-preview",
);
