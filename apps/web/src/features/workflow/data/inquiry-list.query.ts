import { query } from "@solidjs/router";

import { queryMyInquiries } from "~/server/workflow/ui/inquiries";

export const inquiryListQuery = query(
  async () => {
    "use server";
    return queryMyInquiries();
  },
  "workflow.inquiry-list",
);
