import { query } from "@solidjs/router";

type QueryMyInquiries =
  (typeof import("~/actions/workflow/queries/inquiries.action"))["queryMyInquiries"];

export const inquiryListQuery = query(
  async (...args: Parameters<QueryMyInquiries>) => {
    "use server";

    const { queryMyInquiries } =
      await import("~/actions/workflow/queries/inquiries.action");
    return queryMyInquiries(...args);
  },
  "workflow.inquiry-list",
);
